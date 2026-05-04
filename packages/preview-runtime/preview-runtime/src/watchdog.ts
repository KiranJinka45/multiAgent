import { previewManager } from './preview-manager';
import { PreviewRegistry } from '@packages/registry';
import { redis, logger } from '@packages/utils';

export class PreviewWatchdog {
    private static interval: NodeJS.Timeout | null = null;
    private static CHECK_INTERVAL = 30000; // 30 seconds
    private static IDLE_TIMEOUT = 1800000; // 30 minutes

    static start() {
        if (this.interval) return;
        
        logger.info('[Watchdog] Starting Preview Watchdog service...');
        this.interval = setInterval(() => this.check(), this.CHECK_INTERVAL);
    }

    private static async check() {
        try {
            const allPreviews = await PreviewRegistry.listAll();
            const now = Date.now();

            for (const reg of allPreviews) {
                // 1. Idle Shutdown (Service 10)
                const lastAccess = reg.lastHeartbeatAt || reg.startedAt;
                const lastAccessTs = lastAccess ? new Date(lastAccess).getTime() : 0;
                if (reg.status === 'RUNNING' && lastAccessTs && (now - lastAccessTs > this.IDLE_TIMEOUT)) {
                    logger.info({ projectId: reg.projectId }, '[Watchdog] Idle timeout reached. Suspending sandbox...');
                    await previewManager.stopPreview(reg.projectId);
                    await PreviewRegistry.update(reg.projectId, { status: 'STOPPED' });
                    continue;
                }

                // 2. Active Health Check (Phase 5 Hardening)
                if (reg.status === 'RUNNING' && reg.port) {
                    const portOpen = await previewManager.isPortOpen(reg.port);
                    const httpReady = portOpen ? await previewManager.isHttpReady(reg.port) : false;
                    
                    if (!httpReady) {
                        logger.warn({ 
                            projectId: reg.projectId, 
                            port: reg.port,
                            portOpen 
                        }, '[Watchdog] Sandbox HTTP non-responsive. Triggering recovery...');
                        await PreviewRegistry.update(reg.projectId, { status: 'FAILED', failureReason: 'Watchdog health check failed' });
                    }
                }

                // 3. Crash Recovery (Service 7/Watchdog)
                if (reg.status === 'FAILED') {
                    const jitter = Math.floor(Math.random() * 10000);
                    logger.warn({ projectId: reg.projectId, jitter }, '[Watchdog] Sandbox in error state. Scheduling auto-recovery with jitter...');
                    setTimeout(async () => {
                        try {
                            await previewManager.restartPreview(reg.projectId);
                        } catch (err) {
                            logger.error({ projectId: reg.projectId, err }, '[Watchdog] Jittered recovery failed');
                        }
                    }, jitter);
                }
            }
        } catch (error) {
            logger.error({ error }, '[Watchdog] Check loop error');
        }
    }

    static stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
}



