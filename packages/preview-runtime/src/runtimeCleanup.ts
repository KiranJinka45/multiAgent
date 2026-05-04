/**
 * runtimeCleanup.ts
 */

import { PreviewOrchestrator } from './previewOrchestrator.js';
import { PreviewRegistry } from '@packages/registry';
import { ProcessManager } from './processManager.js';
import { ContainerManager } from './containerManager.js';
import { PortManager } from './portManager.js';
import { RuntimeMetrics } from './runtimeMetrics.js';
import { RuntimeGuard } from './runtimeGuard.js';
import { RuntimeHeartbeat } from './runtimeHeartbeat.js';
import { RuntimeCapacity } from './runtimeCapacity.js';
import { RuntimeEscalation } from './runtimeEscalation.js';
import { StaleEvictor } from './cluster/staleEvictor.js';
import { logger } from '@packages/utils';

const RUNTIME_MODE = (process.env.RUNTIME_MODE as 'process' | 'docker') || 'process';

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const STALE_STARTING_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

export const RuntimeCleanup = {
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

    stop(): void {
        if (cleanupTimer) {
            clearInterval(cleanupTimer);
            cleanupTimer = null;
            logger.info('[RuntimeCleanup] Cleanup worker stopped');
        }
    },

    async runCleanupCycle(): Promise<void> {
        logger.info('[RuntimeCleanup] Running cleanup cycle');
        let idleShutdowns = 0;
        let zombiesKilled = 0;
        let orphansKilled = 0;
        let staleCleaned = 0;

        try {
            const allRecords = await PreviewRegistry.listAll();
            const runningIds = allRecords.filter((r: any) => r.status === 'RUNNING').map((r: any) => r.projectId);
            const zombies = await RuntimeHeartbeat.scanForZombies(runningIds);

            for (const zombieId of zombies) {
                logger.warn({ projectId: zombieId }, '[RuntimeCleanup] Killing zombie (no heartbeat)');
                try {
                    await PreviewOrchestrator.stop(zombieId);
                    await RuntimeMetrics.recordCrash(zombieId, 'HEALTH_TIMEOUT');
                    const record = allRecords.find((r: any) => r.projectId === zombieId);
                    await RuntimeEscalation.recordCrash(zombieId, 'Zombie detected', record?.pid ?? null, record?.port ?? null);
                    zombiesKilled++;
                } catch (err) {
                    logger.error({ projectId: zombieId, err }, '[RuntimeCleanup] Failed to kill zombie');
                }
            }

            for (const record of allRecords) {
                const { projectId, status, lastHealthCheck, pid } = record;
                if (status === 'RUNNING' && !zombies.includes(projectId)) {
                    const idle = await RuntimeGuard.isInactive(projectId, lastHealthCheck ?? null);
                    if (idle) {
                        logger.info({ projectId }, '[RuntimeCleanup] Stopping idle runtime');
                        await PreviewOrchestrator.stop(projectId);
                        await RuntimeMetrics.recordCrash(projectId, 'INACTIVITY_SHUTDOWN');
                        idleShutdowns++;
                    }
                }

                if ((status === 'FAILED' || status === 'STOPPED') && pid) {
                    const stillRunning = RUNTIME_MODE === 'docker' ? ContainerManager.isRunning(projectId) : ProcessManager.isRunning(projectId);
                    if (stillRunning) {
                        logger.warn({ projectId, pid, mode: RUNTIME_MODE }, '[RuntimeCleanup] Orphan — killing');
                        if (RUNTIME_MODE === 'docker') await ContainerManager.stop(projectId);
                        else await ProcessManager.stop(projectId);
                        await PortManager.releasePort(projectId);
                        if (record.userId) await RuntimeCapacity.release(record.userId);
                        orphansKilled++;
                    }
                }

                if (status === 'STARTING') {
                    const startAge = Date.now() - new Date(record.startedAt).getTime();
                    if (startAge > STALE_STARTING_THRESHOLD_MS) {
                        logger.warn({ projectId, startAge }, '[RuntimeCleanup] Stale STARTING — cleaning up');
                        await PreviewRegistry.markFailed(projectId, 'Startup timeout');
                        await PortManager.releasePort(projectId);
                        if (record.userId) await RuntimeCapacity.release(record.userId);
                        await RuntimeMetrics.recordCrash(projectId, 'SPAWN_FAIL');
                        staleCleaned++;
                    }
                }
            }

            logger.info({ idleShutdowns, zombiesKilled, orphansKilled, staleCleaned, total: allRecords.length }, '[RuntimeCleanup] Cycle complete');
        } catch (err) {
            logger.error({ err }, '[RuntimeCleanup] Error during cleanup cycle');
        }

        if (RUNTIME_MODE === 'docker') await ContainerManager.pruneImages();
        try { await StaleEvictor.runEvictionScan(); } catch (err) { logger.error({ err }, '[RuntimeCleanup] Eviction scan failed'); }
    },

    async shutdownAll(): Promise<void> {
        logger.info('[RuntimeCleanup] Shutting down all runtimes');
        this.stop();
        RuntimeHeartbeat.stopAll();
        const allRecords = await PreviewRegistry.listAll();
        const running = allRecords.filter((r: any) => r.status === 'RUNNING' || r.status === 'STARTING');
        await Promise.allSettled(running.map(async (r: any) => await PreviewOrchestrator.stop(r.projectId)));
        if (RUNTIME_MODE === 'docker') await ContainerManager.cleanupAll();
        logger.info({ count: running.length }, '[RuntimeCleanup] All runtimes stopped');
    },
};
