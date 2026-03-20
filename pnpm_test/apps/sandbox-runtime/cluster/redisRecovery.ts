/**
 * redisRecovery.ts
 *
 * Phase 4 — Redis Restart / Crash Recovery
 *
 * Handles the scenario where Redis restarts and all in-memory state is lost.
 * On detection, each node must:
 *  1. Re-register itself in the cluster
 *  2. Rebuild runtime records from local process/container state
 *  3. Re-acquire port leases for running processes
 *  4. Re-establish capacity counters
 *
 * Detection: The worker heartbeat fails to write →
 *   catch ECONNREFUSED → wait → attempt recovery once Redis is back.
 *
 * This module is purely recovery logic. No scheduling. No container logic.
 */

import redis from '@queue';
import { NodeRegistry } from './nodeRegistry';
import { ProcessManager } from '../processManager';
import { ContainerManager } from '../containerManager';
import { PreviewRegistry } from '@registry/previewRegistry';
import { PortManager } from '../portManager';
import { RuntimeCapacity } from '../runtimeCapacity';
import { RuntimeHeartbeat } from '../runtimeHeartbeat';
import logger from '@config/logger';

// ─── Config ────────────────────────────────────────────────────────────────

const RECOVERY_KEY = 'cluster:recovery:lastRun';
const RECOVERY_LOCK_TTL = 60_000;
const MAX_RETRIES = 30;
const RETRY_INTERVAL_MS = 2000;

const RUNTIME_MODE = (process.env.RUNTIME_MODE as 'process' | 'docker') || 'process';

// ─── Recovery ──────────────────────────────────────────────────────────────

export const RedisRecovery = {
    /**
     * Check if Redis is reachable. Returns true if a PING succeeds.
     */
    async isRedisAlive(): Promise<boolean> {
        try {
            const pong = await redis.ping();
            return pong === 'PONG';
        } catch {
            return false;
        }
    },

    /**
     * Wait for Redis to come back online after a crash.
     * Blocks with exponential backoff up to MAX_RETRIES.
     */
    async waitForRedis(): Promise<boolean> {
        logger.warn('[RedisRecovery] Redis unreachable — waiting for recovery...');

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            const alive = await this.isRedisAlive();
            if (alive) {
                logger.info({ attempt }, '[RedisRecovery] Redis is back online');
                return true;
            }

            const delay = Math.min(RETRY_INTERVAL_MS * attempt, 30_000); // Cap at 30s
            logger.warn({ attempt, maxRetries: MAX_RETRIES, nextRetryMs: delay },
                '[RedisRecovery] Still waiting...');
            await new Promise(r => setTimeout(r, delay));
        }

        logger.error('[RedisRecovery] Redis did not recover within retry limit');
        return false;
    },

    /**
     * Full recovery procedure. Called when Redis comes back online
     * and all previous state is assumed lost.
     *
     * Steps:
     *  1. Re-register this node
     *  2. Scan local processes/containers for surviving runtimes
     *  3. Rebuild registry records for each
     *  4. Re-acquire port leases
     *  5. Re-establish capacity counters
     *  6. Re-start heartbeat loops
     */
    async performRecovery(): Promise<{
        node: string;
        runtimesRecovered: number;
        portsReacquired: number;
    }> {
        logger.info('[RedisRecovery] Starting full state recovery');

        // 1. Re-register this node in the cluster
        const nodeId = await NodeRegistry.register();
        logger.info({ nodeId }, '[RedisRecovery] Node re-registered');

        // 2. Scan for surviving local runtimes
        let survivingRuntimes: Array<{ projectId: string; port: number; pid: number }> = [];

        if (RUNTIME_MODE === 'docker') {
            // Query Docker for running preview containers
            const containers = ContainerManager.listAll();
            survivingRuntimes = containers
                .filter(c => c.status === 'RUNNING')
                .map(c => ({
                    projectId: c.projectId,
                    port: c.port,
                    pid: 0, // Docker mode uses container ID
                }));
        } else {
            // Query in-memory process registry
            const processes = ProcessManager.listAll();
            survivingRuntimes = processes
                .filter(p => p.status === 'RUNNING')
                .map(p => ({
                    projectId: p.projectId,
                    port: 0,       // We need to recover this
                    pid: p.pid,
                }));
        }

        logger.info({ count: survivingRuntimes.length },
            '[RedisRecovery] Found surviving runtimes');

        let runtimesRecovered = 0;
        let portsReacquired = 0;

        // 3. Rebuild state for each surviving runtime
        for (const runtime of survivingRuntimes) {
            try {
                // Init a fresh registry record
                const record = await PreviewRegistry.init(
                    runtime.projectId,
                    `recovery-${Date.now()}`, // Synthetic executionId
                    undefined
                );

                // Re-acquire the port lease if we know the port
                if (runtime.port > 0) {
                    try {
                        await PortManager.forceAcquirePort(runtime.projectId, runtime.port);
                        portsReacquired++;
                    } catch {
                        logger.warn({ projectId: runtime.projectId, port: runtime.port },
                            '[RedisRecovery] Port re-acquisition failed — port may be in use');
                    }
                }

                // Mark as RUNNING
                const url = `http://localhost:${runtime.port || 3000}`;
                await PreviewRegistry.markRunning(
                    runtime.projectId,
                    url,
                    runtime.port,
                    runtime.pid
                );

                // Re-establish capacity counter
                await RuntimeCapacity.reserve('recovery');

                // Re-start heartbeat
                RuntimeHeartbeat.startLoop(runtime.projectId, runtime.pid, runtime.port);

                runtimesRecovered++;
                logger.info({ projectId: runtime.projectId },
                    '[RedisRecovery] Runtime recovered');

            } catch (err) {
                logger.error({ projectId: runtime.projectId, err },
                    '[RedisRecovery] Failed to recover runtime');
            }
        }

        // Record recovery timestamp
        await redis.set(RECOVERY_KEY, JSON.stringify({
            nodeId,
            recoveredAt: new Date().toISOString(),
            runtimesRecovered,
            portsReacquired,
        }));

        logger.info({
            nodeId,
            runtimesRecovered,
            portsReacquired,
        }, '[RedisRecovery] Recovery complete');

        return { node: nodeId, runtimesRecovered, portsReacquired };
    },

    /**
     * Full recovery flow: wait → recover → resume.
     * Called from worker.ts when a Redis write fails.
     */
    async handleRedisCrash(): Promise<void> {
        const recovered = await this.waitForRedis();
        if (!recovered) {
            logger.error('[RedisRecovery] Cannot recover — exiting process for supervisor restart');
            process.exit(1);
        }

        await this.performRecovery();
    },

    /**
     * Get the last recovery event (admin diagnostics).
     */
    async getLastRecovery(): Promise<any | null> {
        const raw = await redis.get(RECOVERY_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    },
};
