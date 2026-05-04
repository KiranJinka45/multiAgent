/**
 * runtimeCleanup.ts
 *
 * Background cleanup worker for the Runtime Layer.
 * Phase 1: Now integrates heartbeat-based zombie detection.
 *
 * Runs periodically to:
 *  1. Shut down idle runtimes (inactivity TTL)
 *  2. Detect and kill zombie processes (heartbeat missing)
 *  3. Force-kill orphaned processes (registry gone but process alive)
 *  4. Clean up stale STARTING runtimes
 *  5. Release capacity slots for dead runtimes
 *  6. Emit observability events for each cleanup action
 */

import { PreviewOrchestrator } from './previewOrchestrator';
import { PreviewRegistry } from '@packages/registry';
import { ProcessManager } from './processManager';
import { ContainerManager } from './containerManager';
import { PortManager } from './portManager';
import { RuntimeMetrics } from './runtimeMetrics';
import { RuntimeGuard } from './runtimeGuard';
import { RuntimeHeartbeat } from './runtimeHeartbeat';
import { RuntimeCapacity } from './runtimeCapacity';
import { RuntimeEscalation } from './runtimeEscalation';
import { StaleEvictor } from './cluster/staleEvictor';
import { logger } from '@packages/utils';

const RUNTIME_MODE = (process.env.RUNTIME_MODE as 'process' | 'docker') || 'process';

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const STALE_STARTING_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

export const RuntimeCleanup = {
    /**
     * Start the background cleanup loop. Safe to call multiple times — idempotent.
     */
    start(): void {
        if (cleanupTimer) return;

        logger.info('[RuntimeCleanup] Starting background cleanup worker');

        cleanupTimer = setInterval(() => {
            this.runCleanupCycle().catch((err) => {
                logger.error({ err }, '[RuntimeCleanup] Cleanup cycle failed');
            });
        }, CLEANUP_INTERVAL_MS);

        if (cleanupTimer.unref) cleanupTimer.unref();
    },

    /**
     * Stop the cleanup loop.
     */
    stop(): void {
        if (cleanupTimer) {
            clearInterval(cleanupTimer);
            cleanupTimer = null;
            logger.info('[RuntimeCleanup] Cleanup worker stopped');
        }
    },

    /**
     * Run one cleanup cycle.
     */
    async runCleanupCycle(): Promise<void> {
        logger.info('[RuntimeCleanup] Running cleanup cycle');

        let idleShutdowns = 0;
        let zombiesKilled = 0;
        let orphansKilled = 0;
        let staleCleaned = 0;

        try {
            const allRecords = await PreviewRegistry.listAll();

            // ── 1. Zombie detection (Phase 1: heartbeat-based) ──────────
            const runningIds = allRecords
                .filter(r => r.status === 'RUNNING')
                .map(r => r.projectId);

            const zombies = await RuntimeHeartbeat.scanForZombies(runningIds);

            for (const zombieId of zombies) {
                logger.warn({ projectId: zombieId }, '[RuntimeCleanup] Killing zombie (no heartbeat)');
                try {
                    await PreviewOrchestrator.stop(zombieId);
                    await RuntimeMetrics.recordCrash(zombieId, 'HEALTH_TIMEOUT');

                    // Record to escalation
                    const record = allRecords.find(r => r.projectId === zombieId);
                    await RuntimeEscalation.recordCrash(
                        zombieId,
                        'Zombie detected — no heartbeat',
                        record?.pid ?? null,
                        record?.port ?? null
                    );

                    zombiesKilled++;
                } catch (err) {
                    logger.error({ projectId: zombieId, err }, '[RuntimeCleanup] Failed to kill zombie');
                }
            }

            // ── 2. Per-record cleanup ───────────────────────────────────
            for (const record of allRecords) {
                const { projectId, status, lastHealthCheck, pid } = record;

                // ── 2a. Idle RUNNING runtimes ───────────────────────────
                if (status === 'RUNNING' && !zombies.includes(projectId)) {
                    const idle = await RuntimeGuard.isInactive(projectId, lastHealthCheck ?? null);
                    if (idle) {
                        logger.info({ projectId }, '[RuntimeCleanup] Stopping idle runtime');
                        await PreviewOrchestrator.stop(projectId);
                        await RuntimeMetrics.recordCrash(projectId, 'INACTIVITY_SHUTDOWN');
                        idleShutdowns++;
                    }
                }

                // ── 2b. Orphaned FAILED/STOPPED with live process/container ──
                if ((status === 'FAILED' || status === 'STOPPED') && pid) {
                    let stillRunning = false;
                    if (RUNTIME_MODE === 'docker') {
                        stillRunning = ContainerManager.isRunning(projectId);
                    } else {
                        stillRunning = ProcessManager.isRunning(projectId);
                    }
                    if (stillRunning) {
                        logger.warn({ projectId, pid, mode: RUNTIME_MODE }, '[RuntimeCleanup] Orphan — killing');
                        if (RUNTIME_MODE === 'docker') {
                            await ContainerManager.stop(projectId);
                        } else {
                            await ProcessManager.stop(projectId);
                        }
                        await PortManager.releasePort(projectId);
                        if (record.userId) {
                            await RuntimeCapacity.release(record.userId);
                        }
                        orphansKilled++;
                    }
                }

                // ── 2c. Stale STARTING runtimes ─────────────────────────
                if (status === 'STARTING') {
                    const startAge = Date.now() - new Date(record.startedAt).getTime();
                    if (startAge > STALE_STARTING_THRESHOLD_MS) {
                        logger.warn({ projectId, startAge }, '[RuntimeCleanup] Stale STARTING — cleaning up');
                        await PreviewRegistry.markFailed(projectId, 'Startup timeout detected by cleanup worker');
                        await PortManager.releasePort(projectId);
                        if (record.userId) {
                            await RuntimeCapacity.release(record.userId);
                        }
                        await RuntimeMetrics.recordCrash(projectId, 'SPAWN_FAIL');
                        staleCleaned++;
                    }
                }
            }

            logger.info(
                { idleShutdowns, zombiesKilled, orphansKilled, staleCleaned, total: allRecords.length },
                '[RuntimeCleanup] Cycle complete'
            );

        } catch (err) {
            logger.error({ err }, '[RuntimeCleanup] Error during cleanup cycle');
        }

        // Phase 2: Prune stale Docker images
        if (RUNTIME_MODE === 'docker') {
            await ContainerManager.pruneImages();
        }

        // Phase 4: TTL-based stale runtime eviction
        try {
            await StaleEvictor.runEvictionScan();
        } catch (err) {
            logger.error({ err }, '[RuntimeCleanup] Eviction scan failed');
        }
    },

    /**
     * Gracefully shut down ALL running runtimes.
     * Called when the worker process receives SIGTERM.
     */
    async shutdownAll(): Promise<void> {
        logger.info('[RuntimeCleanup] Shutting down all runtimes (graceful shutdown)');
        this.stop();

        // Stop all heartbeat loops
        RuntimeHeartbeat.stopAll();

        const allRecords = await PreviewRegistry.listAll();
        const running = allRecords.filter(r => r.status === 'RUNNING' || r.status === 'STARTING');

        await Promise.allSettled(
            running.map(async (r) => {
                logger.info({ projectId: r.projectId }, '[RuntimeCleanup] Stopping runtime for shutdown');
                await PreviewOrchestrator.stop(r.projectId);
            })
        );

        // Phase 2: Clean all Docker containers
        if (RUNTIME_MODE === 'docker') {
            await ContainerManager.cleanupAll();
        }

        logger.info({ count: running.length }, '[RuntimeCleanup] All runtimes stopped');
    },
};



