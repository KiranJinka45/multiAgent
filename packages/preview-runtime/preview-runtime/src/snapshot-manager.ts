import fs from 'fs-extra';
import path from 'path';
import { redis, logger } from '@packages/utils';

export interface SandboxSnapshot {
    projectId: string;
    timestamp: number;
    filesHash: string;
    snapshotPath: string;
}

export class SnapshotManager {
    private baseDir = path.join(process.cwd(), '.snapshots');

    constructor() {
        fs.ensureDirSync(this.baseDir);
    }

    /**
     * Creates a filesystem snapshot of a ready-to-serve sandbox.
     * In a real production environment (Phase 6.2), this would also involve 
     * CRIU (Checkpoint/Restore In Userspace) for process memory state.
     */
    async createSnapshot(projectId: string, sandboxDir: string): Promise<string> {
        const snapshotId = `${projectId}-${Date.now()}`;
        const snapshotPath = path.join(this.baseDir, snapshotId);

        logger.info({ projectId, snapshotId }, '[SnapshotManager] Creating filesystem snapshot...');

        // 1. Copy files (excluding node_modules as they are symlinked in hyperscale mode)
        await fs.ensureDir(snapshotPath);
        await fs.copy(sandboxDir, snapshotPath, {
            filter: (src) => !src.includes('node_modules') && !src.includes('.git')
        });

        // 2. Store metadata in Redis
        const snapshot: SandboxSnapshot = {
            projectId,
            timestamp: Date.now(),
            filesHash: 'dynamic-hash-placeholder', // In prod, checksum the VFS
            snapshotPath
        };

        await redis.set(`snapshot:latest:${projectId}`, JSON.stringify(snapshot));
        
        return snapshotId;
    }

    /**
     * Restores a sandbox from a snapshot in milliseconds.
     */
    async restoreFromSnapshot(projectId: string, targetDir: string): Promise<boolean> {
        const snapshotData = await redis.get(`snapshot:latest:${projectId}`);
        if (!snapshotData) return false;

        const snapshot: SandboxSnapshot = JSON.parse(snapshotData);
        
        if (!fs.existsSync(snapshot.snapshotPath)) {
            logger.warn({ projectId }, '[SnapshotManager] Snapshot path missing on disk.');
            return false;
        }

        const start = Date.now();
        logger.info({ projectId }, '[SnapshotManager] Restoring from snapshot...');

        // 1. Clean target
        await fs.ensureDir(targetDir);
        
        // 2. Fast copy (In prod, use overlayfs or reflinks for O(1) restore)
        await fs.copy(snapshot.snapshotPath, targetDir);

        logger.info({ projectId, duration: Date.now() - start }, '[SnapshotManager] Restore complete.');
        return true;
    }

    async cleanup(projectId: string) {
        const snapshotData = await redis.get(`snapshot:latest:${projectId}`);
        if (snapshotData) {
            const snapshot: SandboxSnapshot = JSON.parse(snapshotData);
            await fs.remove(snapshot.snapshotPath);
            await redis.del(`snapshot:latest:${projectId}`);
        }
    }
}

export const snapshotManager = new SnapshotManager();



