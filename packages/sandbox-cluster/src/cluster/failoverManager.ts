/**
 * failoverManager.ts
 *
 * Node Failure Detection & Runtime Failover for the Fat Cluster.
 */

// import { NodeRegistry } from './nodeRegistry'; // Unused
import { RuntimeScheduler, ScheduleRequest } from './runtimeScheduler';
import { DistributedLock } from './distributedLock';
import { PreviewRegistry } from '@packages/registry';
import { redis, logger } from '@packages/utils';

const FAILOVER_INTERVAL_MS = 60_000;
const FAILOVER_LOCK_KEY = 'cluster:failover:leader';
const FAILOVER_LOCK_TTL = 55_000;

let _failoverTimer: NodeJS.Timeout | null = null;

export const FailoverManager = {
    start(): void {
        if (_failoverTimer) return;
        logger.info('[FailoverManager] Starting failover monitor');
        _failoverTimer = setInterval(async () => {
            try { await this.runFailoverCycle(); }
            catch (err) { logger.error({ err }, '[FailoverManager] Failover cycle error'); }
        }, FAILOVER_INTERVAL_MS);
        if (_failoverTimer.unref) _failoverTimer.unref();
    },

    stop(): void {
        if (_failoverTimer) {
            clearInterval(_failoverTimer);
            _failoverTimer = null;
            logger.info('[FailoverManager] Failover monitor stopped');
        }
    },

    async runFailoverCycle(): Promise<void> {
        const handle = await DistributedLock.acquire(FAILOVER_LOCK_KEY, FAILOVER_LOCK_TTL);
        if (!handle) return;

        try {
            const deadNodes = await this.detectDeadNodes();
            let rescheduled = 0;

            for (const deadNodeId of deadNodes) {
                logger.error({ deadNodeId }, '[FailoverManager] Dead node detected');
                const rescued = await this.rescheduleFromDeadNode(deadNodeId);
                rescheduled += rescued;
            }

            if (deadNodes.length > 0 || rescheduled > 0) {
                logger.info({ deadNodes: deadNodes.length, rescheduled }, '[FailoverManager] Cycle complete');
            }
        } finally {
            await DistributedLock.release(handle);
        }
    },

    async detectDeadNodes(): Promise<string[]> {
        const registeredIds = await redis.smembers('cluster:nodes');
        const dead: string[] = [];

        for (const nodeId of registeredIds) {
            const exists = await redis.exists(`cluster:node:${nodeId}`);
            if (exists === 0) {
                dead.push(nodeId);
                await redis.srem('cluster:nodes', nodeId);
            }
        }
        return dead;
    },

    async rescheduleFromDeadNode(deadNodeId: string): Promise<number> {
        // Find all projects assigned to this dead node
        // (In a more optimized version, we'd have a project index per node)
        const allProjects = await redis.keys('cluster:assignment:*');
        let rescheduled = 0;

        for (const key of allProjects) {
            const projectId = key.replace('cluster:assignment:', '');
            const assignment = await RuntimeScheduler.getAssignment(projectId);
            
            if (assignment && assignment.nodeId === deadNodeId) {
                const record = await PreviewRegistry.get(projectId);
                if (record && (record.status === 'RUNNING' || record.status === 'STARTING')) {
                    logger.info({ projectId, deadNodeId }, '[FailoverManager] Rescheduling runtime from dead node');
                    
                    const request: ScheduleRequest = {
                        projectId,
                        executionId: record.executionId,
                        userId: record.userId || 'system-failover',
                        requestedAt: new Date().toISOString(),
                    };

                    try {
                        const result = await RuntimeScheduler.schedule(request);
                        if (result.assigned) rescheduled++;
                    } catch (err) {
                        logger.error({ projectId, err }, '[FailoverManager] Failed to reschedule');
                    }
                }
            }
        }
        return rescheduled;
    }
};

