import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { logger } from '../../observability/src';

export class VirtualFileSystem {
    private baseDir: string;
    files: Record<string, string> = {};

    constructor(baseDir?: string) {
        // Default to a hidden sandbox directory if none provided
        this.baseDir = baseDir || path.resolve(process.cwd(), '.sandbox');
    }

    getBaseDir() {
        return this.baseDir;
    }

    private getFullPath(p: string) {
        const resolvedBase = path.resolve(this.baseDir);
        const resolvedPath = path.resolve(resolvedBase, p);

        // Security Pillar 1: Strict prefix check (Sandbox Containment)
        if (!resolvedPath.startsWith(resolvedBase)) {
            logger.error({ path: p, resolvedPath, resolvedBase }, '[VFS] Sandbox escape attempt BLOCKED');
            throw new Error(`[VFS] Security Alert: Path traversal detected: ${p}`);
        }

        // Security Pillar 2: Forbidden Filenames (Windows compatibility & OS protection)
        const basename = path.basename(resolvedPath).toUpperCase().split('.')[0];
        const reserved = [
            'CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 
            'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
        ];
        if (reserved.includes(basename)) {
            throw new Error(`[VFS] Security Alert: Forbidden OS filename: ${basename}`);
        }

        return resolvedPath;
    }

    async read(filePath: string) {
        try {
            const fullPath = this.getFullPath(filePath);
            const content = await fs.readFile(fullPath, 'utf8');
            this.files[filePath] = content;
            return content;
        } catch (e) {
            return this.files[filePath] || '';
        }
    }

    async write(filePath: string, content: string) {
        const fullPath = this.getFullPath(filePath);
        const dir = path.dirname(fullPath);
        await fs.mkdir(dir, { recursive: true });

        // RFC-003: Atomic Write Strategy (Durability over Performance)
        const tempPath = `${fullPath}.tmp-${Date.now()}`;
        let fileHandle: any = null;
        try {
            fileHandle = await fs.open(tempPath, 'w');
            await fs.writeFile(fileHandle, content, 'utf8');
            
            // 🔥 Durability: Ensure bits are physically committed to storage
            if (typeof fileHandle.sync === 'function') {
                await fileHandle.sync();
            }

            await fileHandle.close();
            fileHandle = null;

            // 🔥 Atomicity: Rename is atomic on most POSIX and Windows filesystems
            await fs.rename(tempPath, fullPath);
            this.files[filePath] = content;
        } catch (err: any) {
            if (fileHandle) await fileHandle.close();
            try { await fs.unlink(tempPath); } catch {}
            logger.error({ err: err.message, path: filePath }, '[VFS] Atomic write failed');
            throw err;
        }
    }

    async readFile(filePath: string) {
        return this.read(filePath);
    }

    async writeFile(filePath: string, content: string) {
        return this.write(filePath, content);
    }

    async loadFromDiskState(state: any) {
        // Implementation for hydration if needed
    }

    setFile(filePath: string, content: string) {
        this.files[filePath] = content;
    }

    getAllFiles() {
        return { ...this.files };
    }

    /**
     * 🛡️ Sovereign Mount Protocol
     * Generates a mount configuration that restricts access to this VFS root only.
     * Enforces normalization to prevent lineage drift across working directories.
     */
    getMountProfile(target: string = '/workspace', mode: "ro" | "rw" = "rw") {
        return {
            source: path.resolve(this.baseDir),
            target: path.normalize(target).replace(/\\/g, '/'),
            mode
        };
    }

    // 🔥 Maintenance Pillar 1: Orphan Sandbox Cleanup
    static async cleanupOrphanSandboxes(maxAgeDays: number = 7) {
        const sandboxRoot = path.resolve(process.cwd(), '.sandbox');
        try {
            if (!existsSync(sandboxRoot)) return;
            const projects = await fs.readdir(sandboxRoot);
            const now = Date.now();

            for (const project of projects) {
                const projectPath = path.join(sandboxRoot, project);
                if (!(await fs.stat(projectPath)).isDirectory()) continue;

                const missions = await fs.readdir(projectPath);
                for (const mission of missions) {
                    const missionPath = path.join(projectPath, mission);
                    const stats = await fs.stat(missionPath);
                    const ageDays = (now - stats.mtimeMs) / (1000 * 60 * 60 * 24);

                    if (ageDays > maxAgeDays) {
                        logger.info({ missionPath, ageDays: ageDays.toFixed(2) }, '[VFS] Purging orphan mission sandbox');
                        await fs.rm(missionPath, { recursive: true, force: true });
                    }
                }
            }
        } catch (err: any) {
            logger.error({ err: err.message }, '[VFS] Orphan cleanup failed');
        }
    }
}
