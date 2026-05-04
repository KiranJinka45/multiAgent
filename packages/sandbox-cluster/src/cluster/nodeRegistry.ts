/**
 * nodeRegistry.ts
 *
 * Worker Node Registration & Discovery for the Fat Cluster.
 */

import { randomUUID } from 'crypto';
import os from 'os';
import { redis, logger } from '@packages/utils';

const NODE_PREFIX = 'cluster:node:';
const NODE_SET_KEY = 'cluster:nodes';
const NODE_HEARTBEAT_TTL = 30;
const HEARTBEAT_INTERVAL = 10_000;

const MAX_RUNTIMES_PER_NODE = parseInt(process.env.NODE_MAX_RUNTIMES ?? '25', 10);
const NODE_REGION = process.env.NODE_REGION ?? 'default';

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

let _nodeId: string | null = null;
let _heartbeatTimer: NodeJS.Timeout | null = null;
let _runningCount = 0;

export const NodeRegistry = {
    async register(): Promise<string> {
        _nodeId = randomUUID();
        _runningCount = 0;

        await this.publishHeartbeat();

        _heartbeatTimer = setInterval(async () => {
            try { await this.publishHeartbeat(); }
            catch (err) { logger.error({ err }, '[NodeRegistry] Heartbeat publish failed'); }
        }, HEARTBEAT_INTERVAL);

        if (_heartbeatTimer.unref) _heartbeatTimer.unref();

        await redis.sadd(NODE_SET_KEY, _nodeId);

        logger.info({
            nodeId: _nodeId,
            hostname: os.hostname(),
            region: NODE_REGION,
            maxRuntimes: MAX_RUNTIMES_PER_NODE,
        }, '[NodeRegistry] Node registered');

        return _nodeId;
    },

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
            startedAt: new Date().toISOString(),
            lastHeartbeat: new Date().toISOString(),
            version: '4.0.0-fat',
        };

        await redis.setex(
            `${NODE_PREFIX}${_nodeId}`,
            NODE_HEARTBEAT_TTL,
            JSON.stringify(info)
        );

        logger.debug({ nodeId: _nodeId, load: info.loadAvg1m }, '[NodeRegistry] Heartbeat sent');
    },

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

    async listNodes(): Promise<NodeInfo[]> {
        const nodeIds = await redis.smembers(NODE_SET_KEY);
        if (!nodeIds.length) return [];

        const pipeline = redis.pipeline();
        nodeIds.forEach((id: any) => pipeline.get(`${NODE_PREFIX}${id}`));
        const results = await pipeline.exec();

        const nodes: NodeInfo[] = [];
        const staleIds: string[] = [];

        if (results) {
            for (let i = 0; i < nodeIds.length; i++) {
                const [err, raw] = results[i]!;
                if (err || !raw) {
                    staleIds.push(nodeIds[i]!);
                    continue;
                }
                nodes.push(JSON.parse(raw as string) as NodeInfo);
            }
        }

        if (staleIds.length) {
            await redis.srem(NODE_SET_KEY, ...staleIds);
            logger.info({ staleIds }, '[NodeRegistry] Cleaned stale node entries');
        }

        return nodes;
    },

    async getNode(nodeId: string): Promise<NodeInfo | null> {
        const raw = await redis.get(`${NODE_PREFIX}${nodeId}`);
        if (!raw) return null;
        return JSON.parse(raw) as NodeInfo;
    },

    incrementRunning(): void { _runningCount++; },
    decrementRunning(): void { _runningCount = Math.max(0, _runningCount - 1); },
    getNodeId(): string | null { return _nodeId; },
    getRunningCount(): number { return _runningCount; },
    getMaxRuntimes(): number { return MAX_RUNTIMES_PER_NODE; },
};

