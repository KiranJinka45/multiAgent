import fs from 'fs-extra';
import path from 'path';
import { logger } from '@libs/utils/server';

export interface OverlayConfig {
    baseSnapshotPath: string;
    projectPath: string;
    overlayPath: string;
}

export class SnapshotOverlayManager {
    /**
     * Prepares a writable overlay for a specific project based on a base snapshot.
     * In a real microVM environment, this would involve setting up device mapper
     * or copy-on-write blocks.
     */
    static async prepareOverlay(config: OverlayConfig): Promise<void> {
        const { baseSnapshotPath, projectPath, overlayPath } = config;

        logger.info({ baseSnapshotPath, projectPath }, '[SnapshotOverlayManager] Preparing project overlay...');

        await fs.ensureDir(overlayPath);

        // Simulation: Instead of block-level CoW, we'll use an overlay-style directory structure
        // In a real Firecracker setup, this would be a Snapshot + Diff layer.
        
        // 1. Link the base snapshot as read-only base
        const lowerDir = path.join(overlayPath, 'lower');
        const upperDir = path.join(overlayPath, 'upper');
        const workDir = path.join(overlayPath, 'work');
        const mergedDir = path.join(overlayPath, 'merged');

        await fs.ensureDir(lowerDir);
        await fs.ensureDir(upperDir);
        await fs.ensureDir(workDir);
        await fs.ensureDir(mergedDir);

        // Simulation: Copying files instead of mounting (since we're in a simulated environment)
        // In production, this would be: mount -t overlay overlay -o lowerdir=...,upperdir=...,workdir=... merged
        try {
            // Only copy if lower is empty (initial setup)
            const files = await fs.readdir(lowerDir);
            if (files.length === 0) {
                await fs.copy(baseSnapshotPath, lowerDir);
            }
            
            // Project files go into the upper layer
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
