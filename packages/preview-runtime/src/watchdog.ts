/**
 * watchdog.ts
 */

import { previewManager } from './preview-manager.js';
import { PreviewRegistry } from '@packages/registry';
import { redis, logger } from '@packages/utils';

export class PreviewWatchdog {
    private static interval: any = null;
    private static CHECK_INTERVAL = 30000;
    private static IDLE_TIMEOUT = 1800000;

    static start() {
        if (this.interval) return;
        this.interval = setInterval(() => this.check(), this.CHECK_INTERVAL);
    }

    private static async check() {
        try {
            const allPreviews = await PreviewRegistry.listAll();
            const now = Date.now();
            for (const reg of allPreviews) {
                const lastAccess = reg.lastHeartbeatAt || reg.startedAt;
                const lastAccessTs = lastAccess ? new Date(lastAccess).getTime() : 0;
                if (reg.status === 'RUNNING' && lastAccessTs && (now - lastAccessTs > this.IDLE_TIMEOUT)) {
                    await previewManager.stopPreview(reg.projectId);
                    await PreviewRegistry.update(reg.projectId, { status: 'STOPPED' });
                    continue;
                }
                if (reg.status === 'RUNNING' && reg.port) {
                    const portOpen = await previewManager.isPortOpen(reg.port);
                    if (!portOpen) {
                        await PreviewRegistry.update(reg.projectId, { status: 'FAILED', failureReason: 'Port check failed' });
                    }
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
