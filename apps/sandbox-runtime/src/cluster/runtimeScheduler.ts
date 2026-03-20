/**
 * runtimeScheduler.ts
 *
 * Phase 3 — Load-Aware Runtime Scheduler
 *
 * Decides WHICH node should run a new preview runtime.
 * Uses a weighted scoring algorithm based on:
 *  1. Available capacity (slots remaining)
 *  2. CPU load (1-minute average)
 *  3. Free memory
 *  4. Region affinity (prefer same region as user)
 *
 * The scheduler runs on ANY node — it reads shared Redis state.
 * The selected node picks up work via Redis pub/sub.
 *
 * No process logic. No container logic. Pure scheduling decisions.
 */

import { NodeRegistry, NodeInfo } from './nodeRegistry';
import { DistributedLock } from './distributedLock';
import { PreviewRegistry } from '@libs/registry';
import { StaleEvictor } from './staleEvictor';
import redis from '@libs/utils';
import logger from '@libs/utils';

// ─── Config ────────────────────────────────────────────────────────────────

const SCHEDULE_CHANNEL = 'cluster:schedule:assign';
const PENDING_QUEUE = 'cluster:schedule:pending';
const ASSIGNMENT_PREFIX = 'cluster:assignment:';
const ASSIGNMENT_TTL = 86400; // 24 hours (matched to Registry TTL)

// Scoring weights (sum to 1.0)
const WEIGHT_CAPACITY = 0.40;
const WEIGHT_CPU = 0.25;
const WEIGHT_MEMORY = 0.20;
const WEIGHT_REGION = 0.15;

// ─── Types ─────────────────────────────────────────────────────────────────

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

interface ScoredNode {
    node: NodeInfo;
    score: number;
    breakdown: {
        capacity: number;
        cpu: number;
        memory: number;
        region: number;
    };
}

// ─── Scheduler ─────────────────────────────────────────────────────────────

export const RuntimeScheduler = {
    /**
     * Schedule a runtime on the best available node.
     *
     * Uses a distributed lock to prevent two schedulers from
     * double-assigning the same project.
     */
    async schedule(request: ScheduleRequest): Promise<ScheduleResult> {
        return DistributedLock.withLock(
            `schedule:${request.projectId}`,
            async () => this._doSchedule(request),
            { ttlMs: 10_000, maxRetries: 3, retryDelayMs: 500 }
        );
    },

    /**
     * Internal: perform the actual scheduling.
     */
    async _doSchedule(request: ScheduleRequest): Promise<ScheduleResult> {
        const nodes = await NodeRegistry.listNodes();

        if (nodes.length === 0) {
            logger.error('[Scheduler] No nodes available');
            return { assigned: false, nodeId: null, score: 0, reason: 'No worker nodes registered' };
        }

        // Filter nodes with available capacity AND not draining (Phase 4)
        const availableNodes = await Promise.all(
            nodes.map(async n => {
                const draining = await RollingRestart.isDraining(n.nodeId);
                return { node: n, draining };
            })
        );

        const available = availableNodes
            .filter(n => !n.draining && n.node.runningRuntimes < n.node.maxRuntimes)
            .map(n => n.node);

        if (available.length === 0) {
            // Phase 4: Try preemptive eviction before queuing
            logger.warn({ request }, '[Scheduler] All nodes at capacity — attempting preemptive eviction');
            const evictedId = await StaleEvictor.preemptLowestPriority();

            if (evictedId) {
                // Retry scheduling after eviction freed a slot
                logger.info({ evictedId }, '[Scheduler] Evicted runtime — retrying schedule');
                return this._doSchedule(request);
            }

            // No eviction possible — enqueue
            await this.enqueue(request);
            return {
                assigned: false,
                nodeId: null,
                score: 0,
                reason: `All ${nodes.length} nodes at capacity. Queued for next available slot.`,
            };
        }

        // Score each node
        const scored = available.map(node => this.scoreNode(node, request.preferredRegion));

        // Sort by score descending (highest = best)
        scored.sort((a, b) => b.score - a.score);

        const best = scored[0];

        // Persist assignment
        await redis.setex(
            `${ASSIGNMENT_PREFIX}${request.projectId}`,
            ASSIGNMENT_TTL,
            JSON.stringify({
                nodeId: best.node.nodeId,
                assignedAt: new Date().toISOString(),
                request,
                score: best.score,
                breakdown: best.breakdown,
            })
        );

        // Publish to the assigned node's channel
        await redis.publish(SCHEDULE_CHANNEL, JSON.stringify({
            targetNodeId: best.node.nodeId,
            request,
        }));

        logger.info({
            projectId: request.projectId,
            assignedNode: best.node.nodeId,
            hostname: best.node.hostname,
            score: best.score.toFixed(3),
            breakdown: best.breakdown,
            candidates: scored.length,
        }, '[Scheduler] Runtime assigned to node');

        return {
            assigned: true,
            nodeId: best.node.nodeId,
            score: best.score,
            reason: `Assigned to ${best.node.hostname} (score: ${best.score.toFixed(3)})`,
        };
    },

    /**
     * Score a node for placement (0.0 to 1.0, higher = better).
     */
    scoreNode(node: NodeInfo, preferredRegion?: string): ScoredNode {
        // Capacity score: ratio of free slots
        const freeSlots = node.maxRuntimes - node.runningRuntimes;
        const capacityScore = freeSlots / node.maxRuntimes;

        // CPU score: inverse of load (lower load = higher score)
        // loadAvg1m / cpuCount normalizes across different CPU counts
        const normalizedLoad = node.cpuCount > 0 ? node.loadAvg1m / node.cpuCount : 1;
        const cpuScore = Math.max(0, 1 - normalizedLoad);

        // Memory score: ratio of free memory
        const memoryScore = node.totalMemoryMB > 0
            ? node.freeMemoryMB / node.totalMemoryMB
            : 0;

        // Region affinity: 1.0 if same region, 0.3 otherwise
        const regionScore = (preferredRegion && node.region === preferredRegion) ? 1.0 : 0.3;

        const score =
            (capacityScore * WEIGHT_CAPACITY) +
            (cpuScore * WEIGHT_CPU) +
            (memoryScore * WEIGHT_MEMORY) +
            (regionScore * WEIGHT_REGION);

        return {
            node,
            score,
            breakdown: {
                capacity: parseFloat(capacityScore.toFixed(3)),
                cpu: parseFloat(cpuScore.toFixed(3)),
                memory: parseFloat(memoryScore.toFixed(3)),
                region: parseFloat(regionScore.toFixed(3)),
            },
        };
    },

    /**
     * Enqueue a request when all nodes are at capacity.
     */
    async enqueue(request: ScheduleRequest): Promise<void> {
        await redis.lpush(PENDING_QUEUE, JSON.stringify(request));
    },

    /**
     * Dequeue the next pending request (called when a slot opens on any node).
     */
    async dequeueNext(): Promise<ScheduleRequest | null> {
        const raw = await redis.rpop(PENDING_QUEUE);
        if (!raw) return null;
        return JSON.parse(raw) as ScheduleRequest;
    },

    /**
     * Get pending queue depth.
     */
    async queueDepth(): Promise<number> {
        return redis.llen(PENDING_QUEUE);
    },

    /**
     * Get the assignment for a project (which node was it scheduled to).
     */
    async getAssignment(projectId: string): Promise<any | null> {
        const raw = await redis.get(`${ASSIGNMENT_PREFIX}${projectId}`);
        if (!raw) return null;
        return JSON.parse(raw);
    },

    /**
     * Get cluster-wide scheduling snapshot (for admin dashboard).
     */
    async getClusterSnapshot(): Promise<{
        nodes: (NodeInfo & { score: number })[];
        totalCapacity: number;
        usedCapacity: number;
        queueDepth: number;
    }> {
        const [nodes, queueDepth] = await Promise.all([
            NodeRegistry.listNodes(),
            this.queueDepth(),
        ]);

        const scored = nodes.map(n => ({
            ...n,
            score: this.scoreNode(n).score,
        }));

        const totalCapacity = nodes.reduce((sum, n) => sum + n.maxRuntimes, 0);
        const usedCapacity = nodes.reduce((sum, n) => sum + n.runningRuntimes, 0);

        return { nodes: scored, totalCapacity, usedCapacity, queueDepth };
    },
};
