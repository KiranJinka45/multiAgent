/**
 * processManager.ts
 *
 * Responsible ONLY for: process lifecycle management.
 * No DB logic. No port logic. No URL logic.
 *
 * Tracks spawned process by projectId using an in-process registry.
 * In a multi-node deployment, this would delegate to a Redis-backed process table.
 */

import { spawn, ChildProcess } from 'child_process';
import { logger } from '@packages/utils/server';
import { RuntimeGuard } from './runtimeGuard';

export type ProcessStatus = 'IDLE' | 'STARTING' | 'RUNNING' | 'FAILED' | 'STOPPED';

export interface ManagedProcess {
    pid: number;
    projectId: string;
    status: ProcessStatus;
    startedAt: string;
    cwd: string;
    process: ChildProcess;
}

// In-memory process registry — array of ManagedProcesses per projectId
const processRegistry = new Map<string, ManagedProcess[]>();

export const ProcessManager = {
    /**
     * Start a process for the given project and append to registry.
     */
    async start(
        projectId: string,
        cwd: string,
        command: string = 'npm',
        args: string[] = ['run', 'dev'],
        env: Partial<NodeJS.ProcessEnv> = {},
        timeoutMs: number = 60000
    ): Promise<{ pid: number; cwd: string }> {
        logger.info({ projectId, cwd, command, args }, '[ProcessManager] Spawning process');

        const child = spawn(command, args, RuntimeGuard.safeSpawnOptions(cwd, env as Record<string, string>));

        const managed: ManagedProcess = {
            pid: child.pid!,
            projectId,
            status: 'STARTING',
            startedAt: new Date().toISOString(),
            cwd,
            process: child,
        };

        const existing = processRegistry.get(projectId) || [];
        existing.push(managed);
        processRegistry.set(projectId, existing);

        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                managed.status = 'FAILED';
                reject(new Error(`[ProcessManager] Timeout: process ${command} for ${projectId} did not start in ${timeoutMs}ms`));
            }, timeoutMs);

            child.on('error', (err) => {
                managed.status = 'FAILED';
                clearTimeout(timer);
                logger.error({ projectId, err }, '[ProcessManager] Spawn error');
                reject(err);
            });

            child.on('exit', (code) => {
                managed.status = code === 0 ? 'STOPPED' : 'FAILED';
                logger.warn({ projectId, pid: child.pid, code }, '[ProcessManager] Process exited');
                // We keep it in the registry but marked as stopped for debugging/metrics
            });

            child.stdout!.on('data', (chunk: Buffer) => {
                const line = chunk.toString();
                if (
                    line.includes('Local:') ||
                    line.includes('localhost:') ||
                    line.includes('listening on') ||
                    line.includes('ready on') ||
                    line.includes('started server')
                ) {
                    managed.status = 'RUNNING';
                    clearTimeout(timer);
                    resolve({ pid: child.pid!, cwd });
                }
            });
        });
    },

    /**
     * Stop all processes for a project.
     */
    async stopAll(projectId: string): Promise<void> {
        const processes = processRegistry.get(projectId);
        if (!processes) return;

        logger.info({ projectId, count: processes.length }, '[ProcessManager] Stopping all processes');

        for (const managed of processes) {
            managed.process.kill('SIGTERM');
            // Wait briefly
            await new Promise(r => setTimeout(r, 100));
            if (!managed.process.killed) managed.process.kill('SIGKILL');
        }

        processRegistry.delete(projectId);
    },

    /**
     * Get combined status.
     */
    getStatus(projectId: string): ProcessStatus {
        const processes = processRegistry.get(projectId);
        if (!processes || processes.length === 0) return 'IDLE';
        if (processes.some(p => p.status === 'FAILED')) return 'FAILED';
        if (processes.every(p => p.status === 'RUNNING')) return 'RUNNING';
        if (processes.some(p => p.status === 'STARTING')) return 'STARTING';
        return 'STOPPED';
    },

    /**
     * Get all PIDs.
     */
    getPids(projectId: string): number[] {
        return (processRegistry.get(projectId) || []).map(p => p.pid);
    },

    /**
     * Check if any are running.
     */
    isRunning(projectId: string): boolean {
        const processes = processRegistry.get(projectId);
        return processes?.some(p => p.status === 'RUNNING' || p.status === 'STARTING') ?? false;
    },

    /**
     * List all.
     */
    listAll(): { projectId: string; pids: number[]; status: ProcessStatus }[] {
        return Array.from(processRegistry.entries()).map(([projectId, m]) => ({
            projectId,
            pids: m.map(p => p.pid),
            status: this.getStatus(projectId),
        }));
    },
};
