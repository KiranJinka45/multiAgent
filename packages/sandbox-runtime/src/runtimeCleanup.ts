import Bridge from '@packages/utils';
const { 
    PortManager, 
    ContainerManager, 
    ProcessManager, 
    RuntimeCapacity, 
    RollingRestart, 
    RuntimeHeartbeat, 
    RuntimeMetrics, 
    RuntimeRecord 
} = Bridge as any;

/**
 * runtimeCleanup.ts
 */

import { PreviewOrchestrator } from './previewOrchestrator';
import { PreviewRegistry } from '@packages/registry';
import { logger } from '@packages/observability';
import { StaleEvictor } from './cluster/staleEvictor';

const RUNTIME_MODE = (process.env.RUNTIME_MODE as 'process' | 'docker') || 'process';
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const STALE_STARTING_THRESHOLD_MS = 5 * 60 * 1000;

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

export const RuntimeCleanup = {
    start(): void {
        if (cleanupTimer) return;
        logger.info('[RuntimeCleanup] Starting background cleanup worker');
        cleanupTimer = setInterval(() => {
            this.runCleanupCycle().catch((err: any) => {
                logger.error({ err }, '[RuntimeCleanup] Cleanup cycle failed');
            });
        }, CLEANUP_INTERVAL_MS);
    },

    stop(): void {
        if (cleanupTimer) {
            clearInterval(cleanupTimer);
            cleanupTimer = null;
        }
    },

    async runCleanupCycle(): Promise<void> {
        logger.info('[RuntimeCleanup] Running cleanup cycle');
        let zombiesKilled = 0;
        let orphansKilled = 0;
        let staleCleaned = 0;

        try {
            const allRecords: any[] = await PreviewRegistry.listAll();
            const runningIds = allRecords.filter((r: any) => r.status === 'RUNNING').map((r: any) => r.projectId);

            const zombies = await RuntimeHeartbeat.scanForZombies(runningIds);

            for (const zombieId of zombies) {
                try {
                    await PreviewOrchestrator.stop(zombieId);
                    zombiesKilled++;
                } catch (err) {
                    logger.error({ projectId: zombieId, err }, '[RuntimeCleanup] Failed to kill zombie');
                }
            }

            for (const record of allRecords) {
                const { projectId, status, pid } = record;

                if ((status === 'FAILED' || status === 'STOPPED') && pid) {
                    let stillRunning = false;
                    if (RUNTIME_MODE === 'docker') {
                        stillRunning = await ContainerManager.isRunning(projectId);
                    } else {
                        stillRunning = await ProcessManager.isRunning(projectId);
                    }
                    if (stillRunning) {
                        if (RUNTIME_MODE === 'docker') {
                            await ContainerManager.stop(projectId);
                        } else {
                            await ProcessManager.stopAll(projectId);
                        }
                        await PortManager.releasePorts(projectId);
                        if (record.userId) {
                            await RuntimeCapacity.release(record.userId);
                        }
                        orphansKilled++;
                    }
                }

                if (status === 'STARTING') {
                    const startAge = Date.now() - new Date(record.startedAt).getTime();
                    if (startAge > STALE_STARTING_THRESHOLD_MS) {
                        await PreviewRegistry.markFailed(projectId, 'Startup timeout detected');
                        await PortManager.releasePorts(projectId);
                        if (record.userId) {
                            await RuntimeCapacity.release(record.userId);
                        }
                        staleCleaned++;
                    }
                }
            }
        } catch (err) {
            logger.error({ err }, '[RuntimeCleanup] Error during cleanup cycle');
        }

        if (RUNTIME_MODE === 'docker') {
            await ContainerManager.pruneImages();
        }

        try {
            await StaleEvictor.runEvictionScan();
        } catch {}
    },

    async shutdownAll(): Promise<void> {
        this.stop();
        await RuntimeHeartbeat.stopAll();
        const allRecords: any[] = await PreviewRegistry.listAll();
        const running = allRecords.filter((r: any) => r.status === 'RUNNING' || r.status === 'STARTING');

        await Promise.allSettled(
            running.map(async (r: any) => {
                await PreviewOrchestrator.stop(r.projectId);
            })
        );

        if (RUNTIME_MODE === 'docker') {
            await ContainerManager.cleanupAll();
        }
    },
};


