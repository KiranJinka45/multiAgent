import fs from 'fs-extra';
import path from 'path';
import logger from '@config/logger';

export interface BaseSnapshot {
    id: string;
    framework: string;
    version: string;
    path: string;
}

export class SnapshotLibrary {
    private static snapshotDir = path.join(process.cwd(), '.snapshots', 'base');

    /**
     * Initializes the library and ensures base directories exist.
     */
    static async init() {
        await fs.ensureDir(this.snapshotDir);
    }

    /**
     * Gets the best matching snapshot for a framework.
     */
    static async getSnapshot(framework: string): Promise<BaseSnapshot | null> {
        const snapshots = [
            { id: 'nextjs-base', framework: 'nextjs', version: '14.x', path: path.join(this.snapshotDir, 'nextjs-base') },
            { id: 'vite-base', framework: 'vite', version: '5.x', path: path.join(this.snapshotDir, 'vite-base') },
            { id: 'express-base', framework: 'express', version: '4.x', path: path.join(this.snapshotDir, 'express-base') }
        ];

        const match = snapshots.find(s => s.framework === framework);
        if (match && await fs.pathExists(match.path)) {
            return match;
        }

        return null;
    }

    /**
     * Creates a base snapshot (Admin/System tool).
     */
    static async createBaseSnapshot(id: string, framework: string, sourceDir: string) {
        const dest = path.join(this.snapshotDir, id);
        logger.info({ id, framework }, '[SnapshotLibrary] Creating base snapshot...');
        
        await fs.ensureDir(dest);
        await fs.copy(sourceDir, dest, {
            filter: (src) => !src.includes('node_modules/.cache')
        });

        logger.info({ id }, '[SnapshotLibrary] Base snapshot created successfully.');
    }
}
