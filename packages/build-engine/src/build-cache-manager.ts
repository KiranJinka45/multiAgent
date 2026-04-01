import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { logger } from '@packages/observability';
import { redis } from '@packages/utils/server';

export interface CacheMetadata {
    projectId: string;
    packageHash: string;
    updatedAt: string;
}

export class BuildCacheManager {
    private static casRoot = path.join(process.cwd(), '.cache', 'cas');

    static async init() {
        await fs.ensureDir(this.casRoot);
    }

    /**
     * Store a file or directory in CAS.
     * Returns the hash of the content.
     */
    static async putBlob(sourcePath: string): Promise<string> {
        if (!await fs.pathExists(sourcePath)) return '';
        
        const stat = await fs.stat(sourcePath);
        let hash: string;

        if (stat.isDirectory()) {
            // Directory hashing
            const files = await fs.readdir(sourcePath);
            const manifest: Record<string, string> = {};
            for (const f of files) {
                manifest[f] = await this.putBlob(path.join(sourcePath, f));
            }
            const manifestContent = JSON.stringify(manifest);
            hash = crypto.createHash('sha256').update(manifestContent).digest('hex') + '.dir';
            const blobPath = path.join(this.casRoot, hash);
            if (!await fs.pathExists(blobPath)) {
                await fs.writeJSON(blobPath, manifest);
            }
        } else {
            const content = await fs.readFile(sourcePath);
            hash = crypto.createHash('sha256').update(content).digest('hex');
            const blobPath = path.join(this.casRoot, hash);
            if (!await fs.pathExists(blobPath)) {
                await fs.copy(sourcePath, blobPath);
            }
        }
        return hash;
    }

    /**
     * Restore a blob from CAS to a target path.
     */
    static async getBlob(hash: string, targetPath: string): Promise<boolean> {
        const blobPath = path.join(this.casRoot, hash);
        if (!await fs.pathExists(blobPath)) return false;

        if (hash.endsWith('.dir')) {
            try {
                const manifest = await fs.readJSON(blobPath);
                await fs.ensureDir(targetPath);
                for (const [rel, fileHash] of Object.entries(manifest)) {
                    await this.getBlob(fileHash as string, path.join(targetPath, rel));
                }
                return true;
            } catch (err) {
                logger.error({ err, hash }, '[BuildCacheManager] Directory manifest corrupted');
                return false;
            }
        } else {
            await fs.ensureDir(path.dirname(targetPath));
            await fs.copy(blobPath, targetPath);
            return true;
        }
    }
    /**
     * High-level: Save project sandbox state to CAS.
     */
    static async save(projectId: string, sourcePath: string): Promise<string> {
        await this.init();
        const hash = await this.putBlob(sourcePath);
        if (hash) {
            await redis.set(`build:cache:${projectId}`, hash, 'EX', 86400 * 7); // 7 days
            logger.info({ projectId, hash }, '[BuildCacheManager] Project state saved to CAS');
        }
        return hash;
    }

    /**
     * High-level: Restore project sandbox state from CAS.
     */
    static async restore(projectId: string, targetPath: string): Promise<boolean> {
        await this.init();
        const hash = await redis.get(`build:cache:${projectId}`);
        if (!hash) return false;

        logger.info({ projectId, hash }, '[BuildCacheManager] Restoring project state from CAS...');
        return await this.getBlob(hash, targetPath);
    }
}
