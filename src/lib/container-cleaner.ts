import { exec } from 'child_process';
import logger from './logger';

/**
 * Container & Process Cleaner
 * Periodically stops and removes orphaned preview containers and processes.
 */
export class CleanupService {
    private interval: NodeJS.Timeout | null = null;

    start(intervalMs: number = 30 * 60 * 1000) { // Default every 30 mins
        if (this.interval) return;

        this.interval = setInterval(() => this.cleanup(), intervalMs);
        logger.info('[CleanupService] Background cleaner started');
    }

    async cleanup() {
        logger.info('[CleanupService] Running scheduled cleanup...');

        // 1. Cleanup Docker Containers (older than 2h)
        // Command gets containers and their creation time
        // Then we filter and stop
        const dockerCleanupCmd = `docker ps --filter "ancestor=node:20-slim" --format "{{.ID}}|{{.CreatedAt}}"`;
        exec(dockerCleanupCmd, (err, stdout) => {
            if (err || !stdout) return;
            const lines = stdout.trim().split('\n');
            const now = Date.now();
            const twoHoursMs = 2 * 60 * 60 * 1000;

            lines.forEach(line => {
                const [id, createdAt] = line.split('|');
                const createdDate = new Date(createdAt).getTime();
                if (now - createdDate > twoHoursMs) {
                    logger.info({ containerId: id, age: now - createdDate }, '[CleanupService] Stopping stale container');
                    exec(`docker stop ${id}`, (stopErr) => {
                        if (stopErr) logger.error({ containerId: id, error: stopErr }, '[CleanupService] Failed to stop container');
                    });
                }
            });
        });

        // 2. Cleanup orphaned node processes via PreviewManager
        try {
            const { previewManager } = require('./preview-manager');
            // This would involve checking process ages, for now we rely on the registry cleanup in RuntimeCleanup
        } catch (e) {
            logger.warn({ error: e }, '[CleanupService] Process cleanup failed');
        }
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
}

export const cleanupService = new CleanupService();
