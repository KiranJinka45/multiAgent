import { logger } from '@packages/observability';

export enum MembershipState {
    JOINING = 'JOINING',
    ACTIVE = 'ACTIVE',
    SUSPECT = 'SUSPECT',
    DEGRADED = 'DEGRADED',
    DISCONNECTED = 'DISCONNECTED',
    FENCED = 'FENCED'
}

export interface ClusterMember {
    nodeId: string;
    state: MembershipState;
    lastHeartbeatTime: number;
    host: string;
    port: number;
}

export class ClusterMembershipManager {
    private members = new Map<string, ClusterMember>();

    constructor(private readonly localNodeId: string) {}

    public addMember(nodeId: string, host: string, port: number): void {
        this.members.set(nodeId, {
            nodeId,
            state: nodeId === this.localNodeId ? MembershipState.ACTIVE : MembershipState.JOINING,
            lastHeartbeatTime: Date.now(),
            host,
            port
        });
        logger.info(`[MEMBERSHIP] Added node ${nodeId} (${host}:${port})`);
    }

    public updateMemberState(nodeId: string, state: MembershipState): void {
        const member = this.members.get(nodeId);
        if (member) {
            const prevState = member.state;
            if (prevState !== state) {
                member.state = state;
                logger.warn(`[MEMBERSHIP] Node ${nodeId} state transition: ${prevState} -> ${state}`);
            }
        }
    }

    public getMember(nodeId: string): ClusterMember | undefined {
        return this.members.get(nodeId);
    }

    public getActiveMembers(): ClusterMember[] {
        return Array.from(this.members.values()).filter(
            m => m.state === MembershipState.ACTIVE || m.state === MembershipState.JOINING
        );
    }

    public getAllMembers(): ClusterMember[] {
        return Array.from(this.members.values());
    }

    public getQuorumRequired(): number {
        // Quorum is calculated based on all configured nodes in the cluster
        const totalNodes = this.members.size;
        return Math.floor(totalNodes / 2) + 1;
    }
}

export class PeerHealthManager {
    private intervalId: NodeJS.Timeout | null = null;
    private suspectTimeoutMs = 1500;
    private evictionTimeoutMs = 4000;

    constructor(
        private readonly localNodeId: string,
        private readonly membershipManager: ClusterMembershipManager
    ) {}

    public setSuspicionThresholds(suspectMs: number, evictMs: number): void {
        this.suspectTimeoutMs = suspectMs;
        this.evictionTimeoutMs = evictMs;
    }

    public recordHeartbeat(nodeId: string): void {
        const member = this.membershipManager.getMember(nodeId);
        if (member) {
            member.lastHeartbeatTime = Date.now();
            if (member.state !== MembershipState.ACTIVE) {
                this.membershipManager.updateMemberState(nodeId, MembershipState.ACTIVE);
            }
        }
    }

    public startMonitoring(pingFn: (nodeId: string) => Promise<void>): void {
        if (this.intervalId) return;

        const checkAndPing = async () => {
            const now = Date.now();
            const members = this.membershipManager.getAllMembers();

            for (const member of members) {
                if (member.nodeId === this.localNodeId) continue;

                // Send ping asynchronously
                pingFn(member.nodeId).catch(() => {
                    // Failures will be captured by timeout checks
                });

                const elapsed = now - member.lastHeartbeatTime;

                if (elapsed >= this.evictionTimeoutMs) {
                    if (member.state !== MembershipState.DISCONNECTED && member.state !== MembershipState.FENCED) {
                        this.membershipManager.updateMemberState(member.nodeId, MembershipState.DISCONNECTED);
                    }
                } else if (elapsed >= this.suspectTimeoutMs) {
                    if (member.state === MembershipState.ACTIVE || member.state === MembershipState.JOINING) {
                        this.membershipManager.updateMemberState(member.nodeId, MembershipState.SUSPECT);
                    }
                }
            }
        };

        // Fire first check and ping immediately on startup
        checkAndPing().catch(() => {});

        this.intervalId = setInterval(checkAndPing, 50);

        // Prevent blocking Node process exit in tests
        if (this.intervalId.unref) {
            this.intervalId.unref();
        }
    }

    public stopMonitoring(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}

export class QuorumStateMachine {
    constructor(private readonly membershipManager: ClusterMembershipManager) {}

    /**
     * Checks if a write is permitted. If the number of healthy/active nodes
     * is below the required quorum, writes are blocked.
     */
    public canWrite(): boolean {
        const activeCount = this.membershipManager.getActiveMembers().length;
        const quorumRequired = this.membershipManager.getQuorumRequired();
        return activeCount >= quorumRequired;
    }
}

export class ConnectionSupervisor {
    private reconnectBackoffs = new Map<string, number>();

    constructor(private readonly initialBackoffMs = 50, private readonly maxBackoffMs = 1000) {}

    public getBackoff(nodeId: string): number {
        const current = this.reconnectBackoffs.get(nodeId) || this.initialBackoffMs;
        const next = Math.min(current * 2, this.maxBackoffMs);
        this.reconnectBackoffs.set(nodeId, next);
        return current;
    }

    public resetBackoff(nodeId: string): void {
        this.reconnectBackoffs.delete(nodeId);
    }
}

export class ReplicationFlowController {
    private inFlightCount = 0;
    private waiters: Array<{ resolve: () => void; reject: (err: any) => void; timeout: NodeJS.Timeout }> = [];

    constructor(
        private readonly maxInFlight = 16,
        private readonly acquireTimeoutMs = 3000
    ) {}

    public async acquireWriteSlot(): Promise<void> {
        if (this.inFlightCount < this.maxInFlight) {
            this.inFlightCount++;
            return;
        }

        return new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                const index = this.waiters.findIndex(w => w.resolve === resolve);
                if (index !== -1) {
                    this.waiters.splice(index, 1);
                    reject(new Error(`[FLOW_CONTROL] Timeout waiting for replication slot`));
                }
            }, this.acquireTimeoutMs);

            this.waiters.push({ resolve, reject, timeout });
        });
    }

    public releaseWriteSlot(): void {
        if (this.inFlightCount > 0) {
            this.inFlightCount--;
        }

        const next = this.waiters.shift();
        if (next) {
            clearTimeout(next.timeout);
            this.inFlightCount++;
            next.resolve();
        }
    }

    public getInFlightCount(): number {
        return this.inFlightCount;
    }
}
