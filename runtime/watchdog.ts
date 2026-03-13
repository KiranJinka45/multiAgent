import { previewManager } from './preview-manager';
import { previewRegistry } from './preview-registry';
import logger from '@/config/logger';

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
            const allPreviews = await previewRegistry.getAll();
            const now = Date.now();

            for (const reg of allPreviews) {
                // 1. Idle Shutdown (Service 10)
                const lastAccess = reg.lastAccessedAt || reg.createdAt;
                if (reg.status === 'running' && (now - lastAccess > this.IDLE_TIMEOUT)) {
                    logger.info({ projectId: reg.projectId }, '[Watchdog] Idle timeout reached. Suspending sandbox...');
                    await previewManager.stopPreview(reg.projectId);
                    await previewRegistry.updateStatus(reg.previewId, 'sleeping');
                    continue;
                }

                // 2. Active Health Check (Phase 5 Hardening)
                if (reg.status === 'running') {
                    const portOpen = await previewManager.isPortOpen(reg.containerPort);
                    const httpReady = portOpen ? await previewManager.isHttpReady(reg.containerPort) : false;
                    
                    if (!httpReady) {
                        logger.warn({ 
                            projectId: reg.projectId, 
                            port: reg.containerPort,
                            portOpen 
                        }, '[Watchdog] Sandbox HTTP non-responsive. Triggering recovery...');
                        await previewRegistry.updateStatus(reg.previewId, 'error');
                    }
                }

                // 2. Crash Recovery (Service 7/Watchdog)
                // We could implement an active port check here if needed, 
                // but for now we rely on explicit status tracking.
                if (reg.status === 'error') {
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
