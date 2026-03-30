import { spawn, ChildProcess, exec } from 'child_process';
import util from 'util';
import { logger, eventBus } from '@packages/utils/server';
import { RuntimeGuard } from './runtimeGuard';
import { ContainerManager } from './containerManager';

const execPromise = util.promisify(exec);

export interface RunnerOptions {
    cwd: string;
    env?: Record<string, string>;
    timeoutMs?: number;
    memoryLimitMb?: number;
    executionId: string;
    agentName: string;
    action: string;
    allowEgress?: boolean; // 🔒 Zero-Trust Enforcement
}

export interface RunnerResult {
    success: boolean;
    exitCode: number | null;
    stdout: string;
    stderr: string;
    error?: string;
    egressBlocked?: boolean;
}

export class SandboxRunner {
    private static DEFAULT_TIMEOUT = 60000; // 🛑 Critical: Hardened to 60s for production
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
            // 🛡️ Phase 19: Egress Control Enforcement
            if (!options.allowEgress && (command.includes('curl') || command.includes('http') || command.includes('wget'))) {
                logger.warn({ executionId, command }, '[SandboxRunner] 🛑 Egress attempt detected in isolated environment');
                eventBus.thought(executionId, agentName, '❌ Security Violation: Network egress blocked by Zero-Trust policy');
                return resolve({
                    success: false,
                    exitCode: 1,
                    stdout: '',
                    stderr: 'Egress Blocked by Policy',
                    error: 'Security Violation: Network access denied in sandbox',
                    egressBlocked: true
                });
            }

            // 🛡️ Phase 20: Docker-Based Isolation Refactor
            if (ContainerManager.isAvailable() && options.cwd.includes('.generated-projects')) {
                const projectId = options.cwd.split('.generated-projects').pop()?.replace(/\\|\//g, '') || '';
                
                if (projectId) {
                    logger.info({ projectId, command }, '[SandboxRunner] Using Docker-based execution');
                    
                    (async () => {
                        try {
                            if (!ContainerManager.isRunning(projectId)) {
                                // Default port for non-server commands - doesn't matter much as long as unique
                                const port = 5000 + Math.floor(Math.random() * 1000); 
                                await ContainerManager.start(projectId, port);
                            }
                            
                            const container = `ma-preview-${projectId.slice(0, 12)}`;
                            const result = await ContainerManager.executeCommand(container, command, args);
                            
                            return resolve({
                                success: result.exitCode === 0,
                                exitCode: result.exitCode,
                                stdout: result.stdout,
                                stderr: result.stderr
                            });
                        } catch (err: any) {
                             logger.error({ err }, '[SandboxRunner] Docker execution failed. Falling back to host.');
                        }
                    })();
                }
            }

            const child = spawn(command, args, RuntimeGuard.safeSpawnOptions(cwd, env));

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

        const child = spawn(command, args, RuntimeGuard.safeSpawnOptions(cwd, env));

        child.stdout?.on('data', (data) => {
            eventBus.thought(executionId, agentName, `[Server] ${data.toString().trim()}`);
        });

        child.stderr?.on('data', (data) => {
            eventBus.thought(executionId, agentName, `[Server Error] ${data.toString().trim()}`);
        });

        return child;
    }
}
