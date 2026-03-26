import fs from 'fs-extra';
import path from 'path';
import { logger } from '@libs/utils/server';

export class StorageGC {
    private static TTL_MS = 2 * 60 * 60 * 1000; // 2 hours for previews
    private static CHECK_INTERVAL = 15 * 60 * 1000; // 15 minutes
    private static CRITICAL_DISK_FREE_PERCENT = 10;

    static start() {
        logger.info('[StorageGC] Starting Storage Garbage Collector...');
        setInterval(() => this.run(), this.CHECK_INTERVAL);
        this.run(); // Initial run
    }

    static async run() {
        try {
            logger.info('[StorageGC] Running periodic cleanup...');
            
            await this.cleanupPreviews();
            await this.cleanupMicroVMs();
            await this.checkDiskSpace();

        } catch (err) {
            logger.error({ err }, '[StorageGC] Cleanup cycle failed');
        }
    }

    private static async cleanupPreviews() {
        const previewDir = path.join(process.cwd(), '.previews');
        if (!(await fs.pathExists(previewDir))) return;

        const folders = await fs.readdir(previewDir);
        const now = Date.now();

        for (const folder of folders) {
            if (folder === 'pool') continue; // Don't purge the hot-pool base

            const fullPath = path.join(previewDir, folder);
            const stats = await fs.stat(fullPath);

            // If folder hasn't been modified in TTL, purge it
            if (now - stats.mtimeMs > this.TTL_MS) {
                logger.info({ folder }, '[StorageGC] Purging expired preview environment');
                await fs.remove(fullPath);
            }
        }
    }

    private static async cleanupMicroVMs() {
        const microvmDir = path.join(process.cwd(), '.microvms');
        if (!(await fs.pathExists(microvmDir))) return;

        const folders = await fs.readdir(microvmDir);
        const now = Date.now();

        for (const folder of folders) {
            const fullPath = path.join(microvmDir, folder);
            const stats = await fs.stat(fullPath);

            // MicroVM overlays are more aggressive (1 hour TTL)
            if (now - stats.mtimeMs > this.TTL_MS / 2) {
                logger.info({ folder }, '[StorageGC] Purging expired MicroVM overlay');
                await fs.remove(fullPath);
            }
        }
    }

    private static async checkDiskSpace() {
        // Platform specific disk check would go here
        // For simulation, we'll log a warning if space is likely an issue based on project count
        const previewDir = path.join(process.cwd(), '.previews');
        const snapshotsDir = path.join(process.cwd(), '.snapshots');
        
        const previewCount = (await fs.pathExists(previewDir)) ? (await fs.readdir(previewDir)).length : 0;
        const snapshotCount = (await fs.pathExists(snapshotsDir)) ? (await fs.readdir(snapshotsDir)).length : 0;

        if (previewCount > 50 || snapshotCount > 20) {
            logger.warn({ previewCount, snapshotCount }, '[StorageGC] High artifact count detected. Recommended manual purge.');
        }
    }
}
