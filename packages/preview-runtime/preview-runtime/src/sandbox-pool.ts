import fs from 'fs-extra';
import path from 'path';
import { SnapshotLibrary } from './snapshot-library';
import { logger } from '@packages/utils';

export interface WarmedSandbox {
    id: string;
    framework: string;
    sandboxDir: string;
}

export class SandboxPoolManager {
    private static poolDir = path.join(process.cwd(), '.previews', 'pool');
    private static activePool: WarmedSandbox[] = [];
    private static POOL_SIZE = 3; // Pre-warm 3 containers per framework

    /**
     * Initializes the pool and warms up containers.
     */
    static async init() {
        await fs.ensureDir(this.poolDir);
        await this.warmUp();
    }

    /**
     * Warms up the pool with common frameworks.
     */
    private static async warmUp() {
        const frameworks = ['nextjs', 'vite'];
        for (const framework of frameworks) {
            const count = this.activePool.filter(s => s.framework === framework).length;
            for (let i = count; i < this.POOL_SIZE; i++) {
                await this.createWarmedSandbox(framework);
            }
        }
    }

    /**
     * Creates a new warmed sandbox from a snapshot.
     */
    private static async createWarmedSandbox(framework: string) {
        const snapshot = await SnapshotLibrary.getSnapshot(framework);
        if (!snapshot) return;

        const id = `warmed-${framework}-${Math.random().toString(36).substring(7)}`;
        const sandboxDir = path.join(this.poolDir, id);

        logger.info({ id, framework }, '[SandboxPool] Pre-warming sandbox...');
        
        await fs.ensureDir(sandboxDir);
        await fs.copy(snapshot.path, sandboxDir);

        this.activePool.push({ id, framework, sandboxDir });
    }

    /**
     * Acquires a warmed sandbox from the pool.
     */
    static async acquire(framework: string, targetProjectId: string): Promise<string | null> {
        const index = this.activePool.findIndex(s => s.framework === framework);
        if (index === -1) {
            logger.warn({ framework }, '[SandboxPool] No warmed sandbox available. Falling back to slow path.');
            return null;
        }

        const warmed = this.activePool.splice(index, 1)[0];
        const targetDir = path.join(process.cwd(), '.previews', targetProjectId);

        logger.info({ fromId: warmed.id, toProject: targetProjectId }, '[SandboxPool] Hot-swapping sandbox...');
        
        // Move warmed sandbox to final location
        await fs.move(warmed.sandboxDir, targetDir, { overwrite: true });

        // Replenish the pool asynchronously
        this.createWarmedSandbox(framework).catch(err => logger.error({ err }, '[SandboxPool] Failed to replenish'));

        return targetDir;
    }
}



