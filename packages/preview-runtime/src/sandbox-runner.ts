import { spawn, ChildProcess, exec } from 'child_process';
import util from 'util';
import { logger, eventBus } from '@packages/utils';

const execPromise = util.promisify(exec);

export interface RunnerOptions {
    cwd: string;
    env?: Record<string, string>;
    timeoutMs?: number;
    memoryLimitMb?: number;
    executionId: string;
    agentName: string;
    action: string;
}

export interface RunnerResult {
    success: boolean;
    exitCode: number | null;
    stdout: string;
    stderr: string;
    error?: string;
}

export class SandboxRunner {
    private static DEFAULT_TIMEOUT = 300000; // 5 minutes
    private static DEFAULT_MEMORY_LIMIT = 512; // 512MB

    /**
     * Executes a command in an isolated child process with resource monitoring.
     */
    static async execute(
        command: string,
        args: string[],
        options: RunnerOptions
    ): Promise<RunnerResult> {
        const {
            cwd,
            env = {},
            timeoutMs = this.DEFAULT_TIMEOUT,
            memoryLimitMb = this.DEFAULT_MEMORY_LIMIT,
            executionId,
            agentName,
            action
        } = options;

        logger.info({ executionId, agentName, action, command, args }, 'Spawning isolated sandbox runner');

        return new Promise((resolve) => {
            const child = spawn(command, args, {
                cwd,
                env: { ...process.env, ...env },
                shell: true
            });

            let stdout = '';
            let stderr = '';
            let isAborted = false;

            const timeout = setTimeout(() => {
                isAborted = true;
                child.kill('SIGKILL');
                logger.error({ executionId, agentName, timeoutMs }, 'Sandbox runner timed out');
                eventBus.thought(executionId, agentName, `❌ Execution timed out after ${timeoutMs}ms`);
            }, timeoutMs);

            // Resource Monitoring (Memory)
            const memoryCheckInterval = setInterval(async () => {
                try {
                    // Check if process still exists
                    if (child.pid === undefined || child.killed) return;

                    try {
                        const { stdout: tasklistOutput } = await execPromise(`tasklist /FI "PID eq ${child.pid}" /FO CSV /NH`);
                        if (tasklistOutput.includes(String(child.pid))) {
                            // Format: "node.exe","1234","Console","1","12,345 K"
                            const parts = (tasklistOutput as string).split(',');
                            if (parts[4]) {
                                const memStr = parts[4].replace(/"/g, '').replace(/ K/g, '').replace(/,/g, '').trim();
                                const memKb = parseInt(memStr, 10);
                                const memMb = memKb / 1024;

                                if (memMb > memoryLimitMb) {
                                    isAborted = true;
                                    child.kill('SIGKILL');
                                    logger.error({ executionId, agentName, memMb, memoryLimitMb }, 'Sandbox runner exceeded memory limit');
                                    eventBus.thought(executionId, agentName, `❌ Execution killed: Memory limit (${memoryLimitMb}MB) exceeded. Current: ${Math.round(memMb)}MB`);
                                }
                            }
                        }
                    } catch {
                         // PID might have finished between check and tasklist
                    }
                } catch { /* ignore */ }
            }, 5000);

            child.stdout.on('data', (data) => {
                const chunk = data.toString();
                stdout += chunk;
                // Stream logs to the timeline for real-time visibility
                eventBus.thought(executionId, agentName, chunk.trim());
            });

            child.stderr.on('data', (data) => {
                const chunk = data.toString();
                stderr += chunk;
                eventBus.thought(executionId, agentName, `⚠️ ${chunk.trim()}`);
            });

            child.on('error', (err) => {
                clearTimeout(timeout);
                clearInterval(memoryCheckInterval);
                logger.error({ executionId, agentName, err }, 'Sandbox runner process error');
                resolve({
                    success: false,
                    exitCode: null,
                    stdout,
                    stderr,
                    error: err.message
                });
            });

            child.on('exit', (code) => {
                clearTimeout(timeout);
                clearInterval(memoryCheckInterval);

                if (isAborted) {
                    resolve({
                        success: false,
                        exitCode: code,
                        stdout,
                        stderr,
                        error: 'Process timed out and was killed'
                    });
                    return;
                }

                logger.info({ executionId, agentName, exitCode: code }, 'Sandbox runner process exited');
                resolve({
                    success: code === 0,
                    exitCode: code,
                    stdout,
                    stderr
                });
            });
        });
    }

    /**
     * Specialized wrapper for long-running preview servers.
     * Returns the ChildProcess so it can be managed by the PreviewManager.
     */
    static spawnLongRunning(
        command: string,
        args: string[],
        options: RunnerOptions
    ): ChildProcess {
        const { cwd, env = {}, executionId, agentName } = options;

        const child = spawn(command, args, {
            cwd,
            env: { ...process.env, ...env },
            shell: true
        });

        child.stdout?.on('data', (data) => {
            eventBus.thought(executionId, agentName, `[Server] ${data.toString().trim()}`);
        });

        child.stderr?.on('data', (data) => {
            eventBus.thought(executionId, agentName, `[Server Error] ${data.toString().trim()}`);
        });

        return child;
    }
}



