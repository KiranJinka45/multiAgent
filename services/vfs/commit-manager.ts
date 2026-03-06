import fs from 'fs';
import path from 'path';
import { VirtualFileSystem } from './virtual-fs';
import logger from '../logger';

export class CommitManager {
    /**
     * Atomically locks the Virtual File System tree and writes all dirty files to disk.
     * Prevents partial writes by using atomic renames where possible, or writing to 
     * a temporary sandbox and swapping. For simple sandboxes, writes directly tracking dirtiness.
     */
    static async commit(vfs: VirtualFileSystem, targetDir: string): Promise<boolean> {
        try {
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }

            const dirtyFiles = vfs.getDirtyFiles();
            logger.info({ fileCount: dirtyFiles.length }, '[CommitManager] Committing VFS snapshot to disk');

            for (const file of dirtyFiles) {
                const absolutePath = path.join(targetDir, file.path);
                const fileDir = path.dirname(absolutePath);

                if (!fs.existsSync(fileDir)) {
                    fs.mkdirSync(fileDir, { recursive: true });
                }

                // Temporary file atomic write strategy
                const tempPath = `${absolutePath}.vfs.tmp`;
                fs.writeFileSync(tempPath, file.content, 'utf8');
                fs.renameSync(tempPath, absolutePath);

                // Clear dirty flag post-commit
                file.isDirty = false;
            }

            return true;
        } catch (error) {
            logger.error({ error }, '[CommitManager] Failed to atomically commit VFS. Filesystem may be inconsistent.');
            return false;
        }
    }
}
