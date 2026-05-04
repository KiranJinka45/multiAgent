import fs from 'fs-extra';
import path from 'path';
import { logger } from '@packages/utils';

export interface OverlayConfig {
    baseSnapshotPath: string;
    projectPath: string;
    overlayPath: string;
}

export class SnapshotOverlayManager {
    /**
     * Prepares a writable overlay for a specific project based on a base snapshot.
     */
    static async prepareOverlay(config: OverlayConfig): Promise<void> {
        const { baseSnapshotPath, projectPath, overlayPath } = config;

        logger.info({ baseSnapshotPath, projectPath }, '[SnapshotOverlayManager] Preparing project overlay...');

        await fs.ensureDir(overlayPath);

        const lowerDir = path.join(overlayPath, 'lower');
        const upperDir = path.join(overlayPath, 'upper');
        const workDir = path.join(overlayPath, 'work');
        const mergedDir = path.join(overlayPath, 'merged');

        await fs.ensureDir(lowerDir);
        await fs.ensureDir(upperDir);
        await fs.ensureDir(workDir);
        await fs.ensureDir(mergedDir);

        try {
            const files = await fs.readdir(lowerDir);
            if (files.length === 0) {
                await fs.copy(baseSnapshotPath, lowerDir);
            }
            
            await fs.copy(projectPath, upperDir);
            
            logger.info({ mergedDir }, '[SnapshotOverlayManager] Overlay ready.');
        } catch (err) {
            logger.error({ err }, '[SnapshotOverlayManager] Failed to prepare overlay');
            throw err;
        }
    }

    static async cleanupOverlay(overlayPath: string): Promise<void> {
        logger.info({ overlayPath }, '[SnapshotOverlayManager] Cleaning up overlay...');
        await fs.remove(overlayPath);
    }
}




