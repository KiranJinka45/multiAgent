/**
 * failoverManager.ts
 *
 * Phase 3 — Node Failure Detection & Runtime Failover
 *
 * Monitors the cluster for dead nodes (missed heartbeats) and
 * reschedules their runtimes to surviving nodes.
 *
 * Runs on EVERY worker node. Uses a distributed lock so only one
 * node performs the failover scan at a time (leader election lite).
 *
 * Detection logic:
 *  - Node's Redis key (cluster:node:{id}) has 30s TTL
 *  - If key is missing but node is still in the SET → node is dead
 *  - Runtimes assigned to dead node → reschedule via RuntimeScheduler
 *
 * Rebalancing:
 *  - If a node's load is > 80% while others are < 40% → migrate one runtime
 *  - Migration = stop on overloaded + start on underloaded
 *  - Only one rebalance per cycle to avoid thrashing
 */

import { NodeRegistry } from './nodeRegistry';
import { RuntimeScheduler, ScheduleRequest } from './runtimeScheduler';
import { DistributedLock } from './distributedLock';
import { PreviewRegistry } from '@libs/registry';
import { redis } from '@libs/utils';
import { missionController } from '@libs/utils';
import { logger } from '@libs/utils/server';

// ─── Config ────────────────────────────────────────────────────────────────

const FAILOVER_INTERVAL_MS = 60_000;     // Check every 60 seconds
const FAILOVER_LOCK_KEY = 'cluster:failover:leader';
const FAILOVER_LOCK_TTL = 55_000;     // Slightly less than interval
const REBALANCE_HIGH_THRESHOLD = 0.80;   // 80% utilized
const REBALANCE_LOW_THRESHOLD = 0.40;   // 40% utilized

let _failoverTimer: ReturnType<typeof setInterval> | null = null;

// ─── Failover Manager ─────────────────────────────────────────────────────

export const FailoverManager = {
    /**
     * Start the failover monitoring loop.
     * Every node calls this, but only one wins the distributed lock per cycle.
     */
    start(): void {
        if (_failoverTimer) return;

        logger.info('[FailoverManager] Starting failover monitor');

        _failoverTimer = setInterval(async () => {
            try {
                await this.runFailoverCycle();
            } catch (err) {
                logger.error({ err }, '[FailoverManager] Failover cycle error');
            }
        }, FAILOVER_INTERVAL_MS);

        if (_failoverTimer.unref) _failoverTimer.unref();
    },

    /**
     * Stop the failover monitor.
     */
    stop(): void {
        if (_failoverTimer) {
            clearInterval(_failoverTimer);
            _failoverTimer = null;
            logger.info('[FailoverManager] Failover monitor stopped');
        }
    },

    /**
     * Run one failover cycle. Only one node wins the lock per cycle.
     */
    async runFailoverCycle(): Promise<void> {
        const handle = await DistributedLock.acquire(FAILOVER_LOCK_KEY, FAILOVER_LOCK_TTL);
        if (!handle) {
            // Another node is handling failover
            return;
        }

        try {
            const deadNodes = await this.detectDeadNodes();
            let rescheduled = 0;

            for (const deadNodeId of deadNodes) {
                logger.error({ deadNodeId }, '[FailoverManager] Dead node detected');
                const rescued = await this.rescheduleFromDeadNode(deadNodeId);
                rescheduled += rescued;
            }

            const deadWorkers = await this.detectDeadWorkers();
            let recoveredMissions = 0;
            for (const deadWorkerId of deadWorkers) {
                logger.error({ deadWorkerId }, '[FailoverManager] Dead worker detected');
                const recovered = await this.recoverMissionsFromDeadWorker(deadWorkerId);
                recoveredMissions += recovered;
            }

            // Rebalancing (max 1 migration per cycle)
            const rebalanced = await this.attemptRebalance();

            if (deadNodes.length > 0 || rescheduled > 0 || deadWorkers.length > 0 || recoveredMissions > 0 || rebalanced) {
                logger.info({
                    deadNodes: deadNodes.length,
                    rescheduled,
                    deadWorkers: deadWorkers.length,
                    recoveredMissions,
                    rebalanced,
                }, '[FailoverManager] Cycle complete');
            }

        } finally {
            await DistributedLock.release(handle);
        }
    },

    /**
     * Find nodes that are in the SET but have no heartbeat key (TTL expired).
     */
    async detectDeadNodes(): Promise<string[]> {
        const registeredIds = await redis.smembers('cluster:nodes');
        const dead: string[] = [];

        for (const nodeId of registeredIds) {
            const exists = await redis.exists(`cluster:node:${nodeId}`);
            if (exists === 0) {
                dead.push(nodeId);
                // Remove from active set
                await redis.srem('cluster:nodes', nodeId);
            }
        }

        return dead;
    },

    /**
     * Find all runtimes assigned to a dead node and reschedule them.
     */
    async rescheduleFromDeadNode(deadNodeId: string): Promise<number> {
        const allRecords = await PreviewRegistry.listAll();
        let rescheduled = 0;

        for (const record of allRecords) {
            // Check if this runtime was assigned to the dead node
            const assignment = await RuntimeScheduler.getAssignment(record.projectId);
            if (!assignment || assignment.nodeId !== deadNodeId) continue;

            if (record.status === 'RUNNING' || record.status === 'STARTING') {
                logger.info({
                    projectId: record.projectId,
                    deadNodeId,
                }, '[FailoverManager] Rescheduling runtime from dead node');

                // Mark as failed first (the old process is gone)
                await PreviewRegistry.markFailed(
                    record.projectId,
                    `Node ${deadNodeId} died — rescheduling`
                );

                // Schedule on a new node
                const request: ScheduleRequest = {
                    projectId: record.projectId,
                    executionId: record.executionId,
                    userId: record.userId ?? 'unknown',
                    requestedAt: new Date().toISOString(),
                };

                try {
                    const result = await RuntimeScheduler.schedule(request);
                    if (result.assigned) {
                        rescheduled++;
                    }
                } catch (err) {
                    logger.error({ projectId: record.projectId, err },
                        '[FailoverManager] Failed to reschedule runtime');
                }
            }
        }

        return rescheduled;
    },

    /**
     * Find workers (build-workers) that have no heartbeat key (TTL expired).
     */
    async detectDeadWorkers(): Promise<string[]> {
        const activeHeartbeatKeys = await redis.keys('worker:heartbeat:*');
        const activeWorkerIds = new Set(activeHeartbeatKeys.map(k => k.split(':').pop()));
        
        const activeMissions = await missionController.listActiveMissions();
        const deadWorkers = new Set<string>();

        for (const mission of activeMissions) {
            const missionWorkerId = mission.metadata?.workerId;
            if (missionWorkerId && !activeWorkerIds.has(missionWorkerId as string)) {
                deadWorkers.add(missionWorkerId as string);
            }
        }
        
        return Array.from(deadWorkers);
    },

    /**
     * Requeue missions that were being processed by a dead worker.
     */
    async recoverMissionsFromDeadWorker(deadWorkerId: string): Promise<number> {
        let recovered = 0;
        const activeMissions = await missionController.listActiveMissions();

        for (const mission of activeMissions) {
            if (mission.metadata?.workerId === deadWorkerId) {
                logger.warn({ missionId: mission.id, deadWorkerId }, '[FailoverManager] Recovering mission from dead worker');
                
                // Requeue by moving back to 'queued' or 'planning' and clearing workerId
                await missionController.updateMission(mission.id, {
                    status: 'queued',
                    metadata: { 
                        workerId: undefined,
                        recoveryCount: ((mission.metadata?.recoveryCount as number) || 0) + 1,
                        recoveredAt: new Date().toISOString()
                    }
                });
                
                recovered++;
            }
        }
        return recovered;
    },

    /**
     * Attempt to rebalance: move one runtime from an overloaded node
     * to an underloaded node. Only one migration per cycle.
     */
    async attemptRebalance(): Promise<boolean> {
        const nodes = await NodeRegistry.listNodes();
        if (nodes.length < 2) return false;

        // Find overloaded and underloaded nodes
        const overloaded = nodes.filter(n => {
            const utilization = n.runningRuntimes / n.maxRuntimes;
            return utilization > REBALANCE_HIGH_THRESHOLD;
        });

        const underloaded = nodes.filter(n => {
            const utilization = n.runningRuntimes / n.maxRuntimes;
            return utilization < REBALANCE_LOW_THRESHOLD;
        });

        if (overloaded.length === 0 || underloaded.length === 0) return false;

        // Sort: most overloaded first, most underloaded first
        overloaded.sort((a, b) =>
            (b.runningRuntimes / b.maxRuntimes) - (a.runningRuntimes / a.maxRuntimes));
        underloaded.sort((a, b) =>
            (a.runningRuntimes / a.maxRuntimes) - (b.runningRuntimes / b.maxRuntimes));

        const source = overloaded[0];
        const target = underloaded[0];

        logger.info({
            sourceNode: source.nodeId,
            sourceLoad: `${source.runningRuntimes}/${source.maxRuntimes}`,
            targetNode: target.nodeId,
            targetLoad: `${target.runningRuntimes}/${target.maxRuntimes}`,
        }, '[FailoverManager] Rebalance candidate identified');

        // In a full implementation, we would:
        // 1. Pick a runtime from the source node
        // 2. Stop it there
        // 3. Start it on the target node
        // For now, log the recommendation (actual migration requires cross-node RPC)
        await redis.publish('cluster:rebalance:recommend', JSON.stringify({
            sourceNodeId: source.nodeId,
            targetNodeId: target.nodeId,
            reason: 'load_imbalance',
            timestamp: new Date().toISOString(),
        }));

        return true;
    },

    /**
     * Get failover status snapshot for admin dashboard.
     */
    async getSnapshot(): Promise<{
        isLeader: boolean;
        nodeCount: number;
        deadNodes: string[];
        pendingReschedules: number;
    }> {
        const isLeader = await DistributedLock.isLocked(FAILOVER_LOCK_KEY);
        const deadNodes = await this.detectDeadNodes();
        const pendingReschedules = await RuntimeScheduler.queueDepth();

        return {
            isLeader,
            nodeCount: (await NodeRegistry.listNodes()).length,
            deadNodes,
            pendingReschedules,
        };
    },
};
