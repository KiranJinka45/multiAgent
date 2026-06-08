import * as fs from 'node:fs';
import * as path from 'node:path';
import crypto from 'node:crypto';
import type { EventBlock, StateSnapshot } from './event-store.js';
import { DurableSegmentedWal, AtomicSnapshotStore } from './durable-wal.js';
import { 
    ClusterMembershipManager, 
    PeerHealthManager, 
    QuorumStateMachine, 
    ReplicationFlowController, 
    MembershipState 
} from './cluster-governance.js';

import { propagation, context } from '@opentelemetry/api';
import { ztanQuorumLatencySeconds } from '@packages/observability';

export interface ReplicationMessage<E = any> {
    type: 'APPEND_ENTRIES' | 'SYNC_REQUEST' | 'SYNC_RESPONSE' | 'SNAPSHOT_REQUEST' | 'SNAPSHOT_RESPONSE' | 'HEARTBEAT' | 'ROUTE_WORKFLOW';
    senderId: string;
    epoch: number;
    payload?: any;
    traceContext?: Record<string, string>;
}

export interface AppendEntriesReq<E = any> {
    epoch: number;
    block: EventBlock<E> & { checksum: string };
    leaderId: string;
}

export interface AppendEntriesResp {
    nodeId: string;
    success: boolean;
    lastSequence: number;
    errorReason?: string;
}

export interface SyncRequest {
    fromSequence: number;
}

export interface SyncResponse<E = any> {
    blocks: (EventBlock<E> & { checksum: string })[];
}

export interface ReplicationTransport {
    send(targetNodeId: string, msg: ReplicationMessage): Promise<ReplicationMessage>;
    registerNode(nodeId: string, handler: (msg: ReplicationMessage) => Promise<ReplicationMessage>): void;
}

export class QuorumDurabilityException extends Error {
    constructor(message: string) {
        super(`[REPLICATION::QUORUM_FAILED] ${message}`);
        this.name = 'QuorumDurabilityException';
    }
}

/**
 * In-Memory Asynchronous Simulated Transport Layer
 * Simulates network partitions, latency, and socket errors.
 */
export class SimulatedReplicationTransport implements ReplicationTransport {
    private nodes = new Map<string, (msg: ReplicationMessage) => Promise<ReplicationMessage>>();
    private partitions = new Set<string>(); // Set of partitioned nodeId pairs: "nodeA-nodeB"

    public registerNode(nodeId: string, handler: (msg: ReplicationMessage) => Promise<ReplicationMessage>): void {
        this.nodes.set(nodeId, handler);
    }

    public injectPartition(nodeA: string, nodeB: string): void {
        this.partitions.add(`${nodeA}-${nodeB}`);
        this.partitions.add(`${nodeB}-${nodeA}`);
    }

    public removePartition(nodeA: string, nodeB: string): void {
        this.partitions.delete(`${nodeA}-${nodeB}`);
        this.partitions.delete(`${nodeB}-${nodeA}`);
    }

    public async send(targetNodeId: string, msg: ReplicationMessage): Promise<ReplicationMessage> {
        const sourceId = msg.senderId;
        if (this.partitions.has(`${sourceId}-${targetNodeId}`)) {
            throw new Error(`[TRANSPORT::PARTITION] Network partition between ${sourceId} and ${targetNodeId}`);
        }

        const handler = this.nodes.get(targetNodeId);
        if (!handler) {
            throw new Error(`[TRANSPORT::ERROR] Target node ${targetNodeId} not found`);
        }

        // Simulate network wire latency
        await new Promise(resolve => setTimeout(resolve, 5));

        const parentCtx = propagation.extract(context.active(), msg.traceContext || {});
        return await context.with(parentCtx, () => handler(msg));
    }
}

/**
 * Follower Synchronization Agent
 * Operates on follower replicas, validating incoming leader appends and managing anti-entropy sync.
 */
export class FollowerSyncAgent<E = any> {
    private wal: DurableSegmentedWal<E>;
    private nodeId: string;
    private currentEpoch = 0;

    constructor(nodeId: string, wal: DurableSegmentedWal<E>) {
        this.nodeId = nodeId;
        this.wal = wal;
    }

    public handleHeartbeat(msg: ReplicationMessage): ReplicationMessage {
        if (msg.epoch > this.currentEpoch) {
            this.currentEpoch = msg.epoch;
        }
        return {
            type: 'HEARTBEAT',
            senderId: this.nodeId,
            epoch: this.currentEpoch
        };
    }

    public getLocalWAL(): DurableSegmentedWal<E> {
        return this.wal;
    }

    /**
     * Handles incoming replication requests. Enforces epoch fencing and cryptographic link validation.
     */
    public async handleAppendEntries(req: AppendEntriesReq<E>): Promise<AppendEntriesResp> {
        // 1. Fence check: Reject writes from older epochs
        if (req.epoch < this.currentEpoch) {
            this.wal.recoverLedger();
            return {
                nodeId: this.nodeId,
                success: false,
                lastSequence: this.wal.getNextSequence() - 1,
                errorReason: `Stale epoch: ${req.epoch} < local current: ${this.currentEpoch}`
            };
        }

        // Update local tracking epoch if leader presents newer epoch
        if (req.epoch > this.currentEpoch) {
            this.currentEpoch = req.epoch;
        }

        // Recover current state to check sequence continuity
        const currentBlocks = this.wal.recoverLedger();
        const nextExpectedSeq = this.wal.getNextSequence();

        // 2. Sequence Gap Check: Reject if there is a sequence gap (triggering pull-sync)
        if (req.block.sequence > nextExpectedSeq) {
            return {
                nodeId: this.nodeId,
                success: false,
                lastSequence: nextExpectedSeq - 1,
                errorReason: `Sequence gap. Expected ${nextExpectedSeq}, got ${req.block.sequence}`
            };
        }

        // 3. Duplicate checks: If sequence already exists, verify hash identity
        if (req.block.sequence < nextExpectedSeq) {
            const existingBlock = currentBlocks.find(b => b.sequence === req.block.sequence);
            if (existingBlock) {
                if (existingBlock.hash !== req.block.hash) {
                    return {
                        nodeId: this.nodeId,
                        success: false,
                        lastSequence: nextExpectedSeq - 1,
                        errorReason: `Hash mismatch at existing sequence ${req.block.sequence}`
                    };
                }
            }
            return { nodeId: this.nodeId, success: true, lastSequence: nextExpectedSeq - 1 };
        }

        // 4. Cryptographic Hash Chain Validation
        const expectedPrevHash = currentBlocks.length === 0 ? 'genesis' : currentBlocks[currentBlocks.length - 1].hash;
        const snapshotStore = new AtomicSnapshotStore(this.wal.getWalDir());
        const lastSnapshot = snapshotStore.readSnapshot();
        const isFirstBlockAfterSnapshot = lastSnapshot && req.block.sequence === lastSnapshot.sequence + 1;

        if (req.block.prevHash !== expectedPrevHash && !isFirstBlockAfterSnapshot) {
            return {
                nodeId: this.nodeId,
                success: false,
                lastSequence: nextExpectedSeq - 1,
                errorReason: `Cryptographic link gap. Block prevHash: ${req.block.prevHash}, expected: ${expectedPrevHash}`
            };
        }

        // Append block to follower's local WAL
        try {
            this.wal.appendBlock(req.block);
            return { nodeId: this.nodeId, success: true, lastSequence: nextExpectedSeq };
        } catch (err: any) {
            return {
                nodeId: this.nodeId,
                success: false,
                lastSequence: nextExpectedSeq - 1,
                errorReason: `Failsafe append error: ${err.message}`
            };
        }
    }

    private async requestAndApplySnapshot(leaderId: string, transport: ReplicationTransport): Promise<boolean> {
        try {
            const responseMsg = await transport.send(leaderId, {
                type: 'SNAPSHOT_REQUEST',
                senderId: this.nodeId,
                epoch: this.currentEpoch
            });

            if (responseMsg.type === 'SNAPSHOT_RESPONSE' && responseMsg.payload && responseMsg.payload.snapshot) {
                const snapshot = responseMsg.payload.snapshot as StateSnapshot<any>;
                const snapshotStore = new AtomicSnapshotStore(this.wal.getWalDir());
                snapshotStore.writeSnapshotAtomically(snapshot);
                return true;
            }
        } catch (_err) {
            // Ignore socket/transfer failure
        }
        return false;
    }

    /**
     * Executes pull-based anti-entropy synchronization to catch up to the leader.
     */
    public async runAntiEntropySync(leaderId: string, transport: ReplicationTransport): Promise<number> {
        this.wal.recoverLedger();
        const nextSeq = this.wal.getNextSequence();

        const responseMsg = await transport.send(leaderId, {
            type: 'SYNC_REQUEST',
            senderId: this.nodeId,
            epoch: this.currentEpoch,
            payload: { fromSequence: nextSeq } as SyncRequest
        });

        if (responseMsg.type === 'SYNC_RESPONSE' && responseMsg.payload) {
            const syncPayload = responseMsg.payload as SyncResponse<E>;
            let caughtUpCount = 0;

            if (syncPayload.blocks.length > 0 && syncPayload.blocks[0].sequence > nextSeq) {
                const snapshotApplied = await this.requestAndApplySnapshot(leaderId, transport);
                if (snapshotApplied) {
                    return await this.runAntiEntropySync(leaderId, transport);
                }
                return 0;
            }

            for (const block of syncPayload.blocks) {
                const appendRes = await this.handleAppendEntries({
                    epoch: responseMsg.epoch,
                    block,
                    leaderId
                });
                if (appendRes.success) {
                    caughtUpCount++;
                } else {
                    if (appendRes.errorReason && appendRes.errorReason.includes('Sequence gap')) {
                        const snapshotApplied = await this.requestAndApplySnapshot(leaderId, transport);
                        if (snapshotApplied) {
                            return caughtUpCount + await this.runAntiEntropySync(leaderId, transport);
                        }
                    }
                    break;
                }
            }
            return caughtUpCount;
        }

        return 0;
    }
}

/**
 * Replicated WAL Coordinator
 * Manages write-acknowledgments, strict majorities, and replication broadcasts.
 */
export class ReplicatedWalCoordinator<E = any> {
    private localWal: DurableSegmentedWal<E>;
    private nodeId: string;
    private transport: ReplicationTransport;
    private followers: string[] = [];
    private currentEpoch = 0;

    public membershipManager: ClusterMembershipManager;
    public healthManager: PeerHealthManager;
    public quorumStateMachine: QuorumStateMachine;
    public flowController: ReplicationFlowController;

    constructor(nodeId: string, localWal: DurableSegmentedWal<E>, transport: ReplicationTransport) {
        this.nodeId = nodeId;
        this.localWal = localWal;
        this.transport = transport;

        this.membershipManager = new ClusterMembershipManager(nodeId);
        this.membershipManager.addMember(nodeId, '127.0.0.1', 0); // Local node is active
        this.healthManager = new PeerHealthManager(nodeId, this.membershipManager);
        this.quorumStateMachine = new QuorumStateMachine(this.membershipManager);
        this.flowController = new ReplicationFlowController();
    }

    public registerFollowers(followerIds: string[]): void {
        this.followers = [...followerIds];
        for (const fId of followerIds) {
            let host = '127.0.0.1';
            let port = 0;
            if (this.transport && 'getPeerConfig' in this.transport) {
                const config = (this.transport as any).getPeerConfig(fId);
                if (config) {
                    host = config.host;
                    port = config.port;
                }
            }
            this.membershipManager.addMember(fId, host, port);
        }
    }

    public startHeartbeatMonitoring(): void {
        this.healthManager.startMonitoring(async (peerId) => {
            try {
                const pong = await this.transport.send(peerId, {
                    type: 'HEARTBEAT',
                    senderId: this.nodeId,
                    epoch: this.currentEpoch
                });
                if (pong && pong.type === 'HEARTBEAT') {
                    this.healthManager.recordHeartbeat(peerId);
                }
            } catch (_err) {
                // Ignore send heartbeat errors
            }
        });
    }

    public stopHeartbeatMonitoring(): void {
        this.healthManager.stopMonitoring();
    }

    public setEpoch(epoch: number): void {
        this.currentEpoch = epoch;
    }

    /**
     * Appends locally and coordinates replication until a quorum of nodes acknowledge write persistence.
     */
    public async appendReplicated(payload: E): Promise<EventBlock<E>> {
        // 1. Quorum check: Ensure we have enough active members in our cluster view
        if (!this.quorumStateMachine.canWrite()) {
            throw new QuorumDurabilityException(
                `Replication writes fenced: active node count (${this.membershipManager.getActiveMembers().length}) is below quorum required (${this.membershipManager.getQuorumRequired()}).`
            );
        }

        // 2. Flow control backpressure: Acquire slot
        await this.flowController.acquireWriteSlot();

        try {
            // 3. Append locally
            const block = this.localWal.append(payload);
            
            // Recover payload str and calculate checksum to distribute
            const blockWithChecksum = {
                ...block,
                checksum: crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex')
            };

            const quorumRequired = this.membershipManager.getQuorumRequired();
            let successfulAcks = 1; // Leader counts as 1 ack

            // Only broadcast replication entries to active/suspect followers
            const activeFollowers = this.followers.filter(fId => {
                const m = this.membershipManager.getMember(fId);
                return m && (m.state === MembershipState.ACTIVE || m.state === MembershipState.SUSPECT || m.state === MembershipState.JOINING);
            });

            const replicationStartTime = Date.now();

            // 4. Broadcast replication entries in parallel to active followers
            const replicationPromises = activeFollowers.map(async (followerId) => {
                try {
                    const traceContext: Record<string, string> = {};
                    propagation.inject(context.active(), traceContext);

                    const res = await this.transport.send(followerId, {
                        type: 'APPEND_ENTRIES',
                        senderId: this.nodeId,
                        epoch: this.currentEpoch,
                        traceContext,
                        payload: {
                            epoch: this.currentEpoch,
                            block: blockWithChecksum,
                            leaderId: this.nodeId
                        } as AppendEntriesReq<E>
                    });

                    let response = res.payload as AppendEntriesResp;

                    // Auto-catchup if follower reports a sequence gap due to previously failed/uncommitted appends
                    if (!response.success && response.lastSequence !== undefined && response.lastSequence < block.sequence - 1) {
                        const allBlocks = this.localWal.recoverLedger();
                        const missingBlocks = allBlocks.slice(response.lastSequence);
                        
                        for (const missingBlock of missingBlocks) {
                            const blockWithCs = {
                                ...missingBlock,
                                checksum: crypto.createHash('sha256').update(JSON.stringify(missingBlock.payload)).digest('hex')
                            };
                            const traceContextCatchup: Record<string, string> = {};
                            propagation.inject(context.active(), traceContextCatchup);

                            const catchUpRes = await this.transport.send(followerId, {
                                type: 'APPEND_ENTRIES',
                                senderId: this.nodeId,
                                epoch: this.currentEpoch,
                                traceContext: traceContextCatchup,
                                payload: {
                                    epoch: this.currentEpoch,
                                    block: blockWithCs,
                                    leaderId: this.nodeId
                                } as AppendEntriesReq<E>
                            });
                            response = catchUpRes.payload as AppendEntriesResp;
                            if (!response.success) {
                                break;
                            }
                        }
                    }

                    if (response.success) {
                        successfulAcks++;
                    }
                } catch (_err) {
                    // Network failure or partition
                }
            });

            // Wait for replication responses (or timeouts)
            await Promise.all(replicationPromises);

            const replicationDuration = (Date.now() - replicationStartTime) / 1000;
            ztanQuorumLatencySeconds.observe(replicationDuration);

            // 5. Verify Quorum Consensus
            if (successfulAcks < quorumRequired) {
                throw new QuorumDurabilityException(
                    `Failed to achieve replication write quorum. Acks: ${successfulAcks}/${quorumRequired} required.`
                );
            }

            return block;
        } finally {
            // 6. Release flow slot
            this.flowController.releaseWriteSlot();
        }
    }

    /**
     * Responds to pull-based anti-entropy synchronization requests.
     */
    public handleSyncRequest(req: SyncRequest): SyncResponse<E> {
        const blocks = this.localWal.recoverLedger();
        const filtered = blocks.filter(b => b.sequence >= req.fromSequence);

        // Map blocks to include their SHA-256 payload checksums
        const blocksWithChecksum = filtered.map(b => ({
            ...b,
            checksum: crypto.createHash('sha256').update(JSON.stringify(b.payload)).digest('hex')
        }));

        return { blocks: blocksWithChecksum };
    }

    /**
     * Responds to snapshot replication requests.
     */
    public handleSnapshotRequest(): { snapshot: StateSnapshot<any> | null } {
        const snapshotStore = new AtomicSnapshotStore(this.localWal.getWalDir());
        return { snapshot: snapshotStore.readSnapshot() };
    }
}

/**
 * Quorum Replicated Event Store
 * Top-level store integration that coordinates replication fences and consensus leases.
 */
export class QuorumReplicatedStore<E = any> {
    constructor(
        private readonly coordinator: ReplicatedWalCoordinator<E>,
        private readonly leaseManager: any // DistributedLeaseManager
    ) {}

    public async appendWithQuorum(payload: E): Promise<EventBlock<E>> {
        const activeEpoch = this.leaseManager.getCurrentEpoch();
        if (activeEpoch === 0) {
            throw new Error('[REPLICATION::LEASE_ERROR] Write rejected: local node does not hold active leadership lease.');
        }

        // Keep coordinator epoch updated
        this.coordinator.setEpoch(activeEpoch);

        // Execute quorum replication append
        return await this.coordinator.appendReplicated(payload);
    }
}
