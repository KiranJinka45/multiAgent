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
import path from 'path';
import { logger } from '@libs/utils/server';

export type ProcessStatus = 'IDLE' | 'STARTING' | 'RUNNING' | 'FAILED' | 'STOPPED';

export interface ManagedProcess {
    pid: number;
    projectId: string;
    status: ProcessStatus;
    startedAt: string;
    cwd: string;
    process: ChildProcess;
}

// In-memory process registry — PID-keyed per projectId
// In production multi-node environments, replace with a Redis Hash
const processRegistry = new Map<string, ManagedProcess>();

export const ProcessManager = {
    /**
     * Start a dev server for the given project.
     * Resolves when stdout signals the app is listening.
     * Times out after `timeoutMs` (default 60s).
     */
    async start(
        projectId: string,
        cwd: string,
        command: string = 'npm',
        args: string[] = ['run', 'dev'],
        env: Partial<NodeJS.ProcessEnv> = {},
        timeoutMs: number = 60000
    ): Promise<{ pid: number; cwd: string }> {
        // Kill any existing process for this project first
        if (processRegistry.has(projectId)) {
            await this.stop(projectId);
        }

        logger.info({ projectId, cwd, command, args }, '[ProcessManager] Spawning process');

        const child = spawn(command, args, {
            cwd,
            env: { ...process.env, ...env },
            detached: false,
            shell: true,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        const managed: ManagedProcess = {
            pid: child.pid!,
            projectId,
            status: 'STARTING',
            startedAt: new Date().toISOString(),
            cwd,
            process: child,
        };
        processRegistry.set(projectId, managed);

        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                managed.status = 'FAILED';
                reject(new Error(`[ProcessManager] Timeout: process for ${projectId} did not start in ${timeoutMs}ms`));
            }, timeoutMs);

            child.on('error', (err) => {
                managed.status = 'FAILED';
                clearTimeout(timer);
                logger.error({ projectId, err }, '[ProcessManager] Spawn error');
                reject(err);
            });

            child.on('exit', (code) => {
                managed.status = code === 0 ? 'STOPPED' : 'FAILED';
                logger.warn({ projectId, code }, '[ProcessManager] Process exited');
                processRegistry.delete(projectId);
            });

            // Aggregate stdout to detect server ready signal
            child.stdout!.on('data', (chunk: Buffer) => {
                const line = chunk.toString();
                logger.debug({ projectId, line: line.trim() }, '[ProcessManager] stdout');

                // Detect Next.js / Vite / Express / any server "ready" signal
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

            child.stderr!.on('data', (chunk: Buffer) => {
                const line = chunk.toString();
                logger.debug({ projectId, line: line.trim() }, '[ProcessManager] stderr');
                // Don't reject on stderr — many servers write to stderr normally
            });
        });
    },

    /**
     * Stop a running process for a project.
     */
    async stop(projectId: string): Promise<void> {
        const managed = processRegistry.get(projectId);
        if (!managed) return;

        logger.info({ projectId, pid: managed.pid }, '[ProcessManager] Stopping process');

        managed.process.kill('SIGTERM');
        await new Promise<void>((resolve) => {
            const timeout = setTimeout(() => {
                managed.process.kill('SIGKILL'); // Force kill if SIGTERM doesn't work
                resolve();
            }, 5000);
            managed.process.on('exit', () => {
                clearTimeout(timeout);
                resolve();
            });
        });

        processRegistry.delete(projectId);
        logger.info({ projectId }, '[ProcessManager] Process stopped');
    },

    /**
     * Get the current status of a project's process.
     */
    getStatus(projectId: string): ProcessStatus {
        return processRegistry.get(projectId)?.status ?? 'IDLE';
    },

    /**
     * Get the PID of a running process.
     */
    getPid(projectId: string): number | null {
        return processRegistry.get(projectId)?.pid ?? null;
    },

    /**
     * Check if a project process is running.
     */
    isRunning(projectId: string): boolean {
        const managed = processRegistry.get(projectId);
        return managed?.status === 'RUNNING' || managed?.status === 'STARTING';
    },

    /**
     * List all tracked projects.
     */
    listAll(): { projectId: string; pid: number; status: ProcessStatus }[] {
        return Array.from(processRegistry.entries()).map(([projectId, m]) => ({
            projectId,
            pid: m.pid,
            status: m.status,
        }));
    },
};
