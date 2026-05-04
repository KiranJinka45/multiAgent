/**
 * sandbox-pool.ts
 */

import fs from 'fs-extra';
import path from 'path';
import { SnapshotLibrary } from './snapshot-library.js';
import { logger } from '@packages/utils';

export interface WarmedSandbox {
    id: string;
    framework: string;
    sandboxDir: string;
}

export class SandboxPoolManager {
    private static poolDir = path.join(process.cwd(), '.previews', 'pool');
    private static activePool: WarmedSandbox[] = [];
    private static POOL_SIZE = 3;

    static async init() {
        await fs.ensureDir(this.poolDir);
        await this.warmUp();
    }

    private static async warmUp() {
        const frameworks = ['nextjs', 'vite'];
        for (const framework of frameworks) {
            const count = this.activePool.filter(s => s.framework === framework).length;
            for (let i = count; i < this.POOL_SIZE; i++) {
                await this.createWarmedSandbox(framework);
            }
        }
    }

    private static async createWarmedSandbox(framework: string) {
        const snapshot = await SnapshotLibrary.getSnapshot(framework);
        if (!snapshot) return;

        const id = `warmed-${framework}-${Math.random().toString(36).substring(7)}`;
        const sandboxDir = path.join(this.poolDir, id);
        
        await fs.ensureDir(sandboxDir);
        await fs.copy(snapshot.path, sandboxDir);
        this.activePool.push({ id, framework, sandboxDir });
    }

    static async acquire(framework: string, targetProjectId: string): Promise<string | null> {
        const index = this.activePool.findIndex(s => s.framework === framework);
        if (index === -1) return null;

        const warmed = this.activePool.splice(index, 1)[0];
        if (!warmed) return null;

        const targetDir = path.join(process.cwd(), '.previews', targetProjectId);
        await fs.move(warmed.sandboxDir, targetDir, { overwrite: true });
        this.createWarmedSandbox(framework).catch(() => {});

        return targetDir;
    }
}
