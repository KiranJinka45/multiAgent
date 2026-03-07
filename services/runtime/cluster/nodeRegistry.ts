/**
 * nodeRegistry.ts
 *
 * Phase 3 — Worker Node Registration & Discovery
 *
 * Every worker node registers itself in Redis with:
 *  - nodeId (UUID, generated on boot)
 *  - hostname, region, capacity
 *  - Heartbeat every 10s (30s TTL → auto-deregister on crash)
 *  - Running runtime count + max capacity
 *
 * The scheduler reads this registry to make placement decisions.
 * No process logic. No container logic.
 */

import { randomUUID } from 'crypto';
import { DistributedLock } from './distributedLock';
import os from 'os';
import { nodeCpuUsage, nodeMemoryUsage } from '@configs/metrics';
import redis from '@queue/redis-client';
import logger from '@configs/logger';

// ─── Config ────────────────────────────────────────────────────────────────

const NODE_PREFIX = 'cluster:node:';
const NODE_SET_KEY = 'cluster:nodes';            // Redis SET of active nodeIds
const NODE_HEARTBEAT_TTL = 30;                        // Seconds — auto-deregister on miss
const HEARTBEAT_INTERVAL = 10_000;                    // 10s publish

const MAX_RUNTIMES_PER_NODE = parseInt(process.env.NODE_MAX_RUNTIMES ?? '25', 10);
const NODE_REGION = process.env.NODE_REGION ?? 'default';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface NodeInfo {
    nodeId: string;
    hostname: string;
    region: string;
    maxRuntimes: number;
    runningRuntimes: number;
    cpuCount: number;
    totalMemoryMB: number;
    freeMemoryMB: number;
    loadAvg1m: number;
    startedAt: string;
    lastHeartbeat: string;
    version: string;
}

// ─── Singleton State ───────────────────────────────────────────────────────

let _nodeId: string | null = null;
let _heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let _runningCount = 0;

// ─── Registry ──────────────────────────────────────────────────────────────

export const NodeRegistry = {
    /**
     * Register this worker node in the cluster.
     * Called once on worker boot. Starts the heartbeat loop.
     */
    async register(): Promise<string> {
        _nodeId = randomUUID();
        _runningCount = 0;

        await this.publishHeartbeat();

        _heartbeatTimer = setInterval(async () => {
            try { await this.publishHeartbeat(); }
            catch (err) { logger.error({ err }, '[NodeRegistry] Heartbeat publish failed'); }
        }, HEARTBEAT_INTERVAL);

        if (_heartbeatTimer.unref) _heartbeatTimer.unref();

        // Add to active node set
        await redis.sadd(NODE_SET_KEY, _nodeId);

        logger.info({
            nodeId: _nodeId,
            hostname: os.hostname(),
            region: NODE_REGION,
            maxRuntimes: MAX_RUNTIMES_PER_NODE,
        }, '[NodeRegistry] Node registered');

        return _nodeId;
    },

    /**
     * Publish this node's heartbeat with current resource usage.
     */
    async publishHeartbeat(): Promise<void> {
        if (!_nodeId) return;

        const info: NodeInfo = {
            nodeId: _nodeId,
            hostname: os.hostname(),
            region: NODE_REGION,
            maxRuntimes: MAX_RUNTIMES_PER_NODE,
            runningRuntimes: _runningCount,
            cpuCount: os.cpus().length,
            totalMemoryMB: Math.round(os.totalmem() / 1048576),
            freeMemoryMB: Math.round(os.freemem() / 1048576),
            loadAvg1m: parseFloat(os.loadavg()[0].toFixed(2)),
            startedAt: _nodeId ? new Date().toISOString() : '',
            lastHeartbeat: new Date().toISOString(),
            version: '3.0.0',
        };

        await redis.setex(
            `${NODE_PREFIX}${_nodeId}`,
            NODE_HEARTBEAT_TTL,
            JSON.stringify(info)
        );

        // Update live Prometheus gauges
        nodeCpuUsage.set(info.loadAvg1m / info.cpuCount);
        nodeMemoryUsage.set((os.totalmem() - os.freemem()));

        logger.debug({ nodeId: _nodeId, load: info.loadAvg1m }, '[NodeRegistry] Heartbeat sent');
    },

    /**
     * Deregister this node (graceful shutdown).
     */
    async deregister(): Promise<void> {
        if (!_nodeId) return;

        if (_heartbeatTimer) {
            clearInterval(_heartbeatTimer);
            _heartbeatTimer = null;
        }

        await redis.srem(NODE_SET_KEY, _nodeId);
        await redis.del(`${NODE_PREFIX}${_nodeId}`);

        logger.info({ nodeId: _nodeId }, '[NodeRegistry] Node deregistered');
        _nodeId = null;
    },

    /**
     * Get all currently registered nodes.
     */
    async listNodes(): Promise<NodeInfo[]> {
        const nodeIds = await redis.smembers(NODE_SET_KEY);
        if (!nodeIds.length) return [];

        const pipeline = redis.pipeline();
        nodeIds.forEach(id => pipeline.get(`${NODE_PREFIX}${id}`));
        const results = await pipeline.exec();

        const nodes: NodeInfo[] = [];
        const staleIds: string[] = [];

        for (let i = 0; i < nodeIds.length; i++) {
            const [err, raw] = results![i];
            if (err || !raw) {
                staleIds.push(nodeIds[i]);
                continue;
            }
            nodes.push(JSON.parse(raw as string) as NodeInfo);
        }

        // Clean stale entries from the set
        if (staleIds.length) {
            await redis.srem(NODE_SET_KEY, ...staleIds);
            logger.info({ staleIds }, '[NodeRegistry] Cleaned stale node entries');
        }

        return nodes;
    },

    /**
     * Get info for a specific node.
     */
    async getNode(nodeId: string): Promise<NodeInfo | null> {
        const raw = await redis.get(`${NODE_PREFIX}${nodeId}`);
        if (!raw) return null;
        return JSON.parse(raw) as NodeInfo;
    },

    /**
     * Increment running runtime count on this node.
     */
    incrementRunning(): void { _runningCount++; },

    /**
     * Decrement running runtime count on this node.
     */
    decrementRunning(): void { _runningCount = Math.max(0, _runningCount - 1); },

    /**
     * Get this node's ID.
     */
    getNodeId(): string | null { return _nodeId; },

    /**
     * Get this node's running count.
     */
    getRunningCount(): number { return _runningCount; },

    /**
     * Get max runtimes per node.
     */
    getMaxRuntimes(): number { return MAX_RUNTIMES_PER_NODE; },
};
