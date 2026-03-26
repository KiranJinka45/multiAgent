import { VirtualFileSystem, VirtualFile } from './virtual-fs';
import { logger } from '@libs/observability';

export class RollbackManager {
    private snapshots: Map<string, [string, VirtualFile][]> = new Map();

    /**
     * Saves a named snapshot of the current VFS state.
     */
    saveSnapshot(name: string, vfs: VirtualFileSystem) {
        try {
            const snapshot = vfs.createSnapshot();
            this.snapshots.set(name, snapshot);
            logger.info({ snapshotName: name }, '[RollbackManager] Saved VFS snapshot');
        } catch (error) {
            logger.error({ error, snapshotName: name }, '[RollbackManager] Failed to create snapshot');
        }
    }

    /**
     * Restores the VFS to a previously saved snapshot.
     */
    rollback(name: string, vfs: VirtualFileSystem): boolean {
        const snapshot = this.snapshots.get(name);
        if (!snapshot) {
            logger.warn({ snapshotName: name }, '[RollbackManager] Attempted rollback to non-existent snapshot');
            return false;
        }

        try {
            vfs.restoreSnapshot(snapshot);
            logger.info({ snapshotName: name }, '[RollbackManager] Successfully rolled back VFS');
            return true;
        } catch (error) {
            logger.error({ error, snapshotName: name }, '[RollbackManager] Rollback failed');
            return false;
        }
    }

    /**
     * Clear old snapshots to free memory.
     */
    clearSnapshots() {
        this.snapshots.clear();
    }
}
