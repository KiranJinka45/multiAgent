import { Etcd3 } from 'etcd3';
import { PrismaClient } from '@prisma/client';
import { PerformanceObserver } from 'perf_hooks';
import os from 'os';

/**
 * ─── ZTAN Lease Enforcement & GC Tuning Engine ──────────────────────────────
 * Manages active etcd leader leases, coordinates monotonic epoch generation,
 * registers V8 GC latency telemetry hooks, and updates Postgres active leases.
 * ────────────────────────────────────────────────────────────────────────────
 */

export interface LeaseStatus {
    isLeader: boolean;
    activeEpoch: number;
    leaseId: string;
    ownerPid: number;
    ownerHost: string;
    lastHeartbeat: Date | null;
    gcPauseAlerts: number;
    currentLeaseTtlSec: number;
}

export class ZtanLeaseManager {
    private etcd: Etcd3;
    private prisma: PrismaClient;
    private leaseId = 'ztan-master-lease';
    private activeEpoch = 0;
    private isLeader = false;
    private lastHeartbeat: Date | null = null;
    private gcPauseAlerts = 0;
    private currentLeaseTtlSec = 5; // Base TTL (5 seconds)
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private lagInterval: NodeJS.Timeout | null = null;
    private gcObserver: PerformanceObserver | null = null;
    private etcdLease: any = null;
    private dbConnectionActive = true;

    constructor(etcdEndpoints = 'localhost:2379') {
        const hosts = etcdEndpoints.split(',').map(h => h.trim());
        this.etcd = new Etcd3({ hosts });
        this.prisma = new PrismaClient();
        this.setupGcObserver();
    }

    /**
     * Start the etcd lease capture and heartbeat loops
     */
    public async startLeaseLoop(): Promise<void> {
        console.log(`[Lease Engine] Starting lease loop. Target etcd TTL: ${this.currentLeaseTtlSec}s`);
        
        // Attempt to acquire or renew single-writer lease
        await this.acquireOrRenewLease();

        // Run heartbeat check every 2 seconds
        this.heartbeatInterval = setInterval(async () => {
            try {
                await this.acquireOrRenewLease();
            } catch (err: any) {
                console.error(`[Lease Engine] Heartbeat failure: ${err.message}`);
            }
        }, 2000);
    }

    /**
     * Terminate active loops and disconnect clients
     */
    public async stop(): Promise<void> {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        if (this.lagInterval) {
            clearInterval(this.lagInterval);
        }
        if (this.gcObserver) {
            try {
                this.gcObserver.disconnect();
            } catch (e) {}
            this.gcObserver = null;
        }
        if (this.etcdLease) {
            try {
                await this.etcdLease.revoke();
            } catch (e) {}
        }
        await this.prisma.$disconnect();
        this.etcd.close();
        console.log('[Lease Engine] Connection loops shut down cleanly.');
    }

    /**
     * Fetches current state metrics
     */
    public getStatus(): LeaseStatus {
        return {
            isLeader: this.isLeader,
            activeEpoch: this.activeEpoch,
            leaseId: this.leaseId,
            ownerPid: process.pid,
            ownerHost: os.hostname(),
            lastHeartbeat: this.lastHeartbeat,
            gcPauseAlerts: this.gcPauseAlerts,
            currentLeaseTtlSec: this.currentLeaseTtlSec
        };
    }

    /**
     * Core routine to request etcd lease and update transactional DB fences
     */
    private async acquireOrRenewLease(): Promise<void> {
        try {
            // In a fully containerized scenario, we'd use etcd election primitives.
            // Here we use a key with TTL to achieve robust master lease coordination.
            const leaseKey = `ztan/leader/${this.leaseId}`;
            const clientVal = `${os.hostname()}:${process.pid}`;

            // Create lease with current TTL
            const lease = this.etcd.lease(this.currentLeaseTtlSec);
            this.etcdLease = lease;

            // Atomic set-if-not-exists using transaction
            const txResult = await this.etcd.if(leaseKey, 'Create', '==', 0)
                .then(this.etcd.put(leaseKey).value(clientVal).lease(lease))
                .commit();
            
            let putResult = txResult.succeeded;
            if (!putResult) {
                // If key already exists, check if we are the owner
                const currentVal = await this.etcd.get(leaseKey).string();
                putResult = currentVal === clientVal;
            }

            if (putResult) {
                if (!this.isLeader) {
                    // Transition: We just acquired leadership! Monotonically increment epoch.
                    if (this.activeEpoch === 0 && this.dbConnectionActive) {
                        try {
                            const existingLease = await this.prisma.ztanActiveLease.findUnique({
                                where: { id: this.leaseId }
                            });
                            if (existingLease) {
                                this.activeEpoch = existingLease.generation;
                            }
                        } catch (e) {
                            console.warn(`[Lease Engine] Could not read existing lease generation: ${(e as Error).message}`);
                        }
                    }
                    this.activeEpoch += 1;
                    console.log(`[Lease Engine] Leadership ACQUIRED. Monotonic Epoch Incremented -> ${this.activeEpoch}`);
                }
                this.isLeader = true;
                this.lastHeartbeat = new Date();

                // Propagate lease state down to PostgreSQL storage root authority
                if (this.dbConnectionActive) {
                    await this.prisma.ztanActiveLease.upsert({
                        where: { id: this.leaseId },
                        update: {
                            generation: this.activeEpoch,
                            owner_pid: process.pid,
                            owner_host: os.hostname(),
                            heartbeat: this.lastHeartbeat
                        },
                        create: {
                            id: this.leaseId,
                            generation: this.activeEpoch,
                            owner_pid: process.pid,
                            owner_host: os.hostname(),
                            heartbeat: this.lastHeartbeat
                        }
                    });
                }
            } else {
                if (this.isLeader) {
                    console.warn('[Lease Engine] Leadership LOST or stepped down.');
                }
                this.isLeader = false;
            }
        } catch (err: any) {
            console.error(`[Lease Engine] Failed to coordinate etcd single-writer lease: ${err.message}`);
            this.isLeader = false;
            throw err;
        }
    }

    /**
     * Setup V8 GC Pause Observer using perf_hooks
     */
    private setupGcObserver(): void {
        try {
            this.gcObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                for (const entry of entries) {
                    if (entry.duration > 500) {
                        this.gcPauseAlerts++;
                        console.warn(`[GC Warning] Substantial V8 GC Sweep Detected. Pause: ${entry.duration.toFixed(2)}ms`);
                        
                        // Dynamic Tuning: Expand etcd TTL defensively to prevent split-brain drop out
                        const prevTtl = this.currentLeaseTtlSec;
                        this.currentLeaseTtlSec = Math.min(15, Math.max(5, Math.ceil(entry.duration / 1000) * 2));
                        if (this.currentLeaseTtlSec !== prevTtl) {
                            console.log(`[Lease Engine] Dynamic Tuning: Expanding etcd lease TTL to ${this.currentLeaseTtlSec}s due to GC lag.`);
                        }
                    }
                }
            });
            this.gcObserver.observe({ entryTypes: ['gc'] });
        } catch (e: any) {
            console.warn(`[GC Warning] Failed to initialize Native V8 GC Observer: ${e.message}`);
        }

        // Unconditional Event Loop Lag Tracker (monitors CPU scheduling starvation & freeze pathologies)
        let lastTime = Date.now();
        this.lagInterval = setInterval(() => {
            const now = Date.now();
            const lag = now - lastTime - 1000;
            if (lag > 500) {
                this.gcPauseAlerts++;
                console.warn(`[Loop Lag Warning] High Event-loop lag detected: ${lag}ms`);
                const prevTtl = this.currentLeaseTtlSec;
                this.currentLeaseTtlSec = Math.min(15, Math.max(5, Math.ceil(lag / 1000) * 2));
                if (this.currentLeaseTtlSec !== prevTtl) {
                    console.log(`[Lease Engine] Dynamic Tuning: Expanding etcd lease TTL to ${this.currentLeaseTtlSec}s due to event-loop lag.`);
                }
            }
            lastTime = now;
        }, 1000);
    }

    /**
     * For manual injection of DB outages during testing
     */
    public setDbConnectionState(active: boolean) {
        this.dbConnectionActive = active;
    }
}
