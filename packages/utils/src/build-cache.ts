import * as fs from 'fs-extra';
import * as path from 'path';
import { logger } from '@packages/observability';

export class BuildCache {
    private static CACHE_ROOT = path.join(process.cwd(), '.build-cache');

    /**
     * Restores a node_modules cache into the target directory using symlinks.
     * This is an O(1) operation regardless of dependency size.
     */
    static async restore(templateId: string, targetDir: string): Promise<boolean> {
        const cachePath = path.join(this.CACHE_ROOT, templateId, 'node_modules');
        const targetPath = path.join(targetDir, 'node_modules');

        if (!await fs.pathExists(cachePath)) {
            logger.warn({ templateId }, '[BuildCache] Cache miss: No node_modules found for template');
            return false;
        }

        try {
            // Ensure target directory exists
            await fs.ensureDir(targetDir);

            // Create symlink
            // On Windows, this requires 'junction' or 'dir' type if not running as admin
            await fs.symlink(cachePath, targetPath, 'junction');
            
            logger.info({ templateId, targetDir }, '[BuildCache] Cache restored successfully (symlinked)');
            return true;
        } catch (err: any) {
            logger.error({ err: err.message, templateId }, '[BuildCache] Failed to restore cache');
            return false;
        }
    }

    /**
     * Saves the current node_modules of a project into the global cache.
     */
    static async save(templateId: string, sourceDir: string): Promise<void> {
        const sourcePath = path.join(sourceDir, 'node_modules');
        const cachePath = path.join(this.CACHE_ROOT, templateId, 'node_modules');

        if (!await fs.pathExists(sourcePath)) {
            logger.warn({ templateId, sourcePath }, '[BuildCache] Cannot save: Source node_modules not found');
            return;
        }

        try {
            await fs.ensureDir(path.dirname(cachePath));
            
            // If cache already exists, we might want to update it or skip
            // For now, we'll overwrite it to ensure it's fresh
            if (await fs.pathExists(cachePath)) {
                await fs.remove(cachePath);
            }

            await fs.copy(sourcePath, cachePath);
            logger.info({ templateId }, '[BuildCache] Cache updated successfully');
        } catch (err: any) {
            logger.error({ err: err.message, templateId }, '[BuildCache] Failed to save cache');
        }
    }
}
