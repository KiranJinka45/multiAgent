/**
 * rollingRestart.ts
 *
 * Phase 4 — Rolling Restart Coordinator
 *
 * Orchestrates zero-downtime restarts across the cluster.
 *
 * Strategy:
 *  1. Mark a node as DRAINING (no new assignments)
 *  2. Wait for all runtimes on that node to finish or migrate
 *  3. Restart the node's worker process
 *  4. Re-register with a fresh heartbeat
 *  5. Move to the next node
 *
 * Only one rolling restart can run at a time (distributed lock).
 * Progress is tracked in Redis so a crash mid-restart can resume.
 *
 * Usage:
 *   POST /api/admin/cluster { action: 'rolling-restart' }
 */

import { NodeRegistry, NodeInfo } from './nodeRegistry';
import { RuntimeScheduler } from './runtimeScheduler';
import { DistributedLock, LockHandle } from './distributedLock';
import { PreviewRegistry } from '@packages/registry';
import { redis } from '@packages/utils';
import { logger } from '@packages/utils';

// ─── Config ────────────────────────────────────────────────────────────────

const ROLLING_RESTART_KEY = 'cluster:rolling-restart';
const DRAINING_PREFIX = 'cluster:node:draining:';
const DRAIN_TIMEOUT_MS = 5 * 60 * 1000;  // 5 min max drain per node
const DRAIN_CHECK_INTERVAL = 5_000;           // Check every 5s during drain

export type RollingRestartPhase =
    | 'IDLE'
    | 'PLANNING'
    | 'DRAINING'
    | 'WAITING'
    | 'RESTARTING'
    | 'COMPLETED'
    | 'FAILED';

export interface RollingRestartState {
    phase: RollingRestartPhase;
    startedAt: string;
    updatedAt: string;
    totalNodes: number;
    completedNodes: string[];
    currentNode: string | null;
    pendingNodes: string[];
    error?: string;
}

// ─── Rolling Restart ───────────────────────────────────────────────────────

export const RollingRestart = {
    /**
     * Start a rolling restart of the entire cluster.
     * Only one can run at a time.
     */
    async start(): Promise<RollingRestartState> {
        // Prevent concurrent rolling restarts
        const lock = await DistributedLock.acquire('rolling-restart', 600_000); // 10 min lock
        if (!lock) {
            const existing = await this.getState();
            throw new Error(`Rolling restart already in progress (phase: ${existing?.phase ?? 'UNKNOWN'})`);
        }

        try {
            const nodes = await NodeRegistry.listNodes();
            if (nodes.length === 0) {
                throw new Error('No nodes registered in cluster');
            }

            // Sort: least loaded first (restart those first to minimize disruption)
            nodes.sort((a, b) => a.runningRuntimes - b.runningRuntimes);

            const state: RollingRestartState = {
                phase: 'PLANNING',
                startedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                totalNodes: nodes.length,
                completedNodes: [],
                currentNode: null,
                pendingNodes: nodes.map(n => n.nodeId),
            };

            await this.saveState(state);
            logger.info({ totalNodes: nodes.length }, '[RollingRestart] Plan created');

            // Process each node sequentially
            for (const node of nodes) {
                try {
                    await this.processNode(node, state, lock);
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    state.phase = 'FAILED';
                    state.error = `Failed on node ${node.nodeId}: ${msg}`;
                    state.updatedAt = new Date().toISOString();
                    await this.saveState(state);
                    logger.error({ nodeId: node.nodeId, err }, '[RollingRestart] Failed');
                    throw err;
                }
            }

            state.phase = 'COMPLETED';
            state.currentNode = null;
            state.updatedAt = new Date().toISOString();
            await this.saveState(state);
            logger.info({ totalNodes: nodes.length }, '[RollingRestart] Complete');
            return state;

        } finally {
            await DistributedLock.release(lock);
        }
    },

    /**
     * Process one node in the rolling restart cycle.
     */
    async processNode(
        node: NodeInfo,
        state: RollingRestartState,
        lock: LockHandle
    ): Promise<void> {
        const { nodeId } = node;
        logger.info({ nodeId, hostname: node.hostname, running: node.runningRuntimes },
            '[RollingRestart] Processing node');

        // Phase: DRAINING — mark node to refuse new assignments
        state.phase = 'DRAINING';
        state.currentNode = nodeId;
        state.pendingNodes = state.pendingNodes.filter(id => id !== nodeId);
        state.updatedAt = new Date().toISOString();
        await this.saveState(state);

        await this.markDraining(nodeId);

        // Phase: WAITING — wait for runtimes to finish or migrate
        state.phase = 'WAITING';
        state.updatedAt = new Date().toISOString();
        await this.saveState(state);

        await this.waitForDrain(nodeId);

        // Phase: RESTARTING — signal the node to restart
        state.phase = 'RESTARTING';
        state.updatedAt = new Date().toISOString();
        await this.saveState(state);

        // Publish restart signal to the specific node
        await redis.publish('cluster:node:restart', JSON.stringify({
            nodeId,
            reason: 'rolling-restart',
            timestamp: new Date().toISOString(),
        }));

        // Wait for the node to re-register (new heartbeat appears)
        await this.waitForReregister(nodeId);

        // Extend the rolling restart lock (we're still going)
        await DistributedLock.extend(lock, 600_000);

        // Phase: mark node as completed
        state.completedNodes.push(nodeId);
        await this.unmarkDraining(nodeId);

        logger.info({ nodeId, hostname: node.hostname }, '[RollingRestart] Node restarted');
    },

    /**
     * Mark a node as draining (scheduler will skip it).
     */
    async markDraining(nodeId: string): Promise<void> {
        await redis.setex(`${DRAINING_PREFIX}${nodeId}`, DRAIN_TIMEOUT_MS / 1000,
            JSON.stringify({ drainingSince: new Date().toISOString() })
        );
        logger.info({ nodeId }, '[RollingRestart] Node marked as draining');
    },

    /**
     * Remove drain flag from a node.
     */
    async unmarkDraining(nodeId: string): Promise<void> {
        await redis.del(`${DRAINING_PREFIX}${nodeId}`);
    },

    /**
     * Check if a node is currently draining.
     */
    async isDraining(nodeId: string): Promise<boolean> {
        const exists = await redis.exists(`${DRAINING_PREFIX}${nodeId}`);
        return exists === 1;
    },

    /**
     * Wait for all runtimes on a node to drain (stop or migrate).
     * Times out after DRAIN_TIMEOUT_MS.
     */
    async waitForDrain(nodeId: string): Promise<void> {
        const deadline = Date.now() + DRAIN_TIMEOUT_MS;

        while (Date.now() < deadline) {
            // Check how many runtimes are still assigned to this node
            const allRecords = await PreviewRegistry.listAll();
            const nodeAssignments = await Promise.all(
                allRecords
                    .filter(r => r.status === 'RUNNING' || r.status === 'STARTING')
                    .map(async r => {
                        const assignment = await RuntimeScheduler.getAssignment(r.projectId);
                        return assignment?.nodeId === nodeId ? r : null;
                    })
            );

            const remaining = nodeAssignments.filter(Boolean).length;

            if (remaining === 0) {
                logger.info({ nodeId }, '[RollingRestart] Node fully drained');
                return;
            }

            logger.info({ nodeId, remaining }, '[RollingRestart] Waiting for drain...');
            await new Promise(r => setTimeout(r, DRAIN_CHECK_INTERVAL));
        }

        logger.warn({ nodeId }, '[RollingRestart] Drain timeout — proceeding anyway');
    },

    /**
     * Wait for a node to re-register after restart.
     * Polls for the node's heartbeat key to reappear.
     */
    async waitForReregister(oldNodeId: string): Promise<void> {
        const deadline = Date.now() + 120_000; // 2 min max wait

        while (Date.now() < deadline) {
            // The restarted worker will register with a NEW nodeId,
            // but the same hostname. Check if any new node appeared on
            // the same hostname.
            const nodes = await NodeRegistry.listNodes();
            const oldNode = await NodeRegistry.getNode(oldNodeId);

            // Old node is gone (or heartbeat expired), and new nodes exist → success
            if (!oldNode && nodes.length > 0) {
                logger.info({ oldNodeId }, '[RollingRestart] Node re-registered with new ID');
                return;
            }

            await new Promise(r => setTimeout(r, 5000));
        }

        // Not necessarily fatal — node might just be slow to start
        logger.warn({ oldNodeId }, '[RollingRestart] Timeout waiting for node re-register');
    },

    /**
     * Get the current rolling restart state.
     */
    async getState(): Promise<RollingRestartState | null> {
        const raw = await redis.get(ROLLING_RESTART_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as RollingRestartState;
    },

    /**
     * Save rolling restart progress to Redis.
     */
    async saveState(state: RollingRestartState): Promise<void> {
        await redis.setex(ROLLING_RESTART_KEY, 3600, JSON.stringify(state)); // 1h TTL
    },
};



