/**
 * runtimeScheduler.ts
 *
 * Load-Aware Runtime Scheduler for the Fat Cluster.
 */

import { NodeRegistry, NodeInfo } from './nodeRegistry';
import { DistributedLock } from './distributedLock';
import { redis, logger } from '@packages/utils';

const SCHEDULE_CHANNEL = 'cluster:schedule:assign';
const PENDING_QUEUE = 'cluster:schedule:pending';
const ASSIGNMENT_PREFIX = 'cluster:assignment:';
const ASSIGNMENT_TTL = 86400;

const WEIGHT_CAPACITY = 0.40;
const WEIGHT_CPU = 0.25;
const WEIGHT_MEMORY = 0.20;
const WEIGHT_REGION = 0.15;

export interface ScheduleRequest {
    projectId: string;
    executionId: string;
    userId: string;
    preferredRegion?: string;
    requestedAt: string;
}

export interface ScheduleResult {
    assigned: boolean;
    nodeId: string | null;
    score: number;
    reason: string;
}

export const RuntimeScheduler = {
    async schedule(request: ScheduleRequest): Promise<ScheduleResult> {
        const lockKey = `schedule:${request.projectId}`;
        const handle = await DistributedLock.acquire(lockKey, 10000);
        if (!handle) {
            return { assigned: false, nodeId: null, score: 0, reason: 'Scheduling lock contention' };
        }

        try {
            return await this._doSchedule(request);
        } finally {
            await DistributedLock.release(handle);
        }
    },

    async _doSchedule(request: ScheduleRequest): Promise<ScheduleResult> {
        const nodes = await NodeRegistry.listNodes();

        if (nodes.length === 0) {
            logger.error('[Scheduler] No nodes available');
            return { assigned: false, nodeId: null, score: 0, reason: 'No worker nodes registered' };
        }

        const available = nodes.filter(n => n.runningRuntimes < n.maxRuntimes);

        if (available.length === 0) {
            await this.enqueue(request);
            return {
                assigned: false,
                nodeId: null,
                score: 0,
                reason: `All ${nodes.length} nodes at capacity. Queued.`,
            };
        }

        const scored = available.map(node => this.scoreNode(node, request.preferredRegion));
        scored.sort((a: any, b: any) => b.score - a.score);

        const best = scored[0]!;

        await redis.setex(
            `${ASSIGNMENT_PREFIX}${request.projectId}`,
            ASSIGNMENT_TTL,
            JSON.stringify({
                nodeId: best.node.nodeId,
                assignedAt: new Date().toISOString(),
                request,
                score: best.score,
            })
        );

        await redis.publish(SCHEDULE_CHANNEL, JSON.stringify({
            targetNodeId: best.node.nodeId,
            request,
        }));

        logger.info({
            projectId: request.projectId,
            assignedNode: best.node.nodeId,
            score: best.score.toFixed(3),
        }, '[Scheduler] Runtime assigned');

        return {
            assigned: true,
            nodeId: best.node.nodeId,
            score: best.score,
            reason: `Assigned to ${best.node.hostname}`,
        };
    },

    scoreNode(node: NodeInfo, preferredRegion?: string) {
        const capacityScore = (node.maxRuntimes - node.runningRuntimes) / node.maxRuntimes;
        const normalizedLoad = node.cpuCount > 0 ? node.loadAvg1m / node.cpuCount : 1;
        const cpuScore = Math.max(0, 1 - normalizedLoad);
        const memoryScore = node.totalMemoryMB > 0 ? node.freeMemoryMB / node.totalMemoryMB : 0;
        const regionScore = (preferredRegion && node.region === preferredRegion) ? 1.0 : 0.3;

        const score =
            (capacityScore * WEIGHT_CAPACITY) +
            (cpuScore * WEIGHT_CPU) +
            (memoryScore * WEIGHT_MEMORY) +
            (regionScore * WEIGHT_REGION);

        return { node, score };
    },

    async enqueue(request: ScheduleRequest): Promise<void> {
        await redis.lpush(PENDING_QUEUE, JSON.stringify(request));
    },

    async dequeueNext(): Promise<ScheduleRequest | null> {
        const raw = await redis.rpop(PENDING_QUEUE);
        if (!raw) return null;
        return JSON.parse(raw) as ScheduleRequest;
    },

    async queueDepth(): Promise<number> {
        return redis.llen(PENDING_QUEUE);
    },

    async getAssignment(projectId: string): Promise<any | null> {
        const raw = await redis.get(`${ASSIGNMENT_PREFIX}${projectId}`);
        if (!raw) return null;
        return JSON.parse(raw);
    },
};




