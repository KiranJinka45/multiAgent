import { spawn, ChildProcess, exec } from 'child_process';
import util from 'util';
import { eventBus } from '@packages/utils';
import { logger } from '@packages/observability';
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
    private static MAX_OUTPUT_SIZE = 1024 * 1024; // 1MB 🛡️ Output Throttling
    private static DISK_QUOTA_MB = 100; // 100MB 🛡️ Disk Quota

    // 🛡️ Spawn Rate Limiting (Fork Bomb Protection)
    private static spawnTimestamps: number[] = [];
    private static MAX_SPAWNS_PER_MINUTE = 30;

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

        // 🛡️ Rate Limit Check
        const now = Date.now();
        this.spawnTimestamps = this.spawnTimestamps.filter(t => now - t < 60000);
        if (this.spawnTimestamps.length >= this.MAX_SPAWNS_PER_MINUTE) {
            logger.error({ executionId }, '[SandboxRunner] 🛑 Spawn rate limit exceeded. Possible fork bomb or runaway agent.');
            return {
                success: false,
                exitCode: 1,
                stdout: '',
                stderr: 'Rate Limit Exceeded',
                error: 'Security Violation: Maximum spawn rate reached'
            };
        }
        this.spawnTimestamps.push(now);

        logger.info({ executionId, agentName, action, command, args }, 'Spawning isolated sandbox runner');

        // 🛡️ Phase 19: Egress Control Enforcement
        if (!options.allowEgress && (command.includes('curl') || command.includes('http') || command.includes('wget'))) {
            logger.warn({ executionId, command }, '[SandboxRunner] 🛑 Egress attempt detected in isolated environment');
            eventBus.thought(executionId, agentName, '❌ Security Violation: Network egress blocked by Zero-Trust policy');
            return {
                success: false,
                exitCode: 1,
                stdout: '',
                stderr: 'Egress Blocked by Policy',
                error: 'Security Violation: Network access denied in sandbox',
                egressBlocked: true
            };
        }

        // 🛡️ Phase 20: Docker-Based Isolation Refactor (Production Path)
        if (options.cwd.includes('.generated-projects')) {
            const dockerAvailable = await ContainerManager.isAvailable();
            if (dockerAvailable) {
                const projectId = options.cwd.split('.generated-projects').pop()?.replace(/\\|\//g, '') || '';
                if (projectId) {
                    logger.info({ projectId, command }, '[SandboxRunner] Using Docker-based execution');
                    try {
                        if (!ContainerManager.isRunning(projectId)) {
                            const port = 5000 + Math.floor(Math.random() * 1000); 
                            await ContainerManager.start(projectId, port);
                        }
                        
                        const container = `ma-preview-${projectId.slice(0, 12)}`;
                        const result = await ContainerManager.executeCommand(container, command, args);
                        
                        return {
                            success: result.exitCode === 0,
                            exitCode: result.exitCode,
                            stdout: result.stdout,
                            stderr: result.stderr
                        };
                    } catch (err: any) {
                        logger.error({ err }, '[SandboxRunner] Docker execution failed. Falling back to host.');
                    }
                }
            }
        }

        // FALLBACK: Host-level process isolation (with resource watchdog)
        return new Promise((resolve) => {
            const child = spawn(command, args, RuntimeGuard.safeSpawnOptions(cwd, env));

            let stdout = '';
            let stderr = '';
            let isAborted = false;

            const timeout = setTimeout(() => {
                isAborted = true;
                this.killProcessTree(child.pid, executionId);
                logger.error({ executionId, agentName, timeoutMs }, 'Sandbox runner timed out');
                eventBus.thought(executionId, agentName, `❌ Execution timed out after ${timeoutMs}ms`);
            }, timeoutMs);

            // 🛡️ Resource Monitoring (Memory & Disk Quota)
            const resourceWatchdog = setInterval(async () => {
                try {
                    if (child.pid === undefined || child.killed || isAborted) return;

                    // 1. Memory Check
                    const { stdout: tasklistOutput } = await execPromise(`tasklist /FI "PID eq ${child.pid}" /FO CSV /NH`);
                    if (tasklistOutput.includes(String(child.pid))) {
                        const parts = (tasklistOutput as string).split(',');
                        if (parts[4]) {
                            const memStr = parts[4].replace(/"/g, '').replace(/ K/g, '').replace(/,/g, '').trim();
                            const memKb = parseInt(memStr, 10);
                            const memMb = memKb / 1024;

                            if (memMb > memoryLimitMb) {
                                isAborted = true;
                                this.killProcessTree(child.pid, executionId);
                                logger.error({ executionId, agentName, memMb, memoryLimitMb }, 'Sandbox runner exceeded memory limit');
                                eventBus.thought(executionId, agentName, `❌ Execution killed: Memory limit exceeded.`);
                            }
                        }
                    }

                    // 2. Disk Quota Check
                    const { stdout: sizeOutput } = await execPromise(`powershell -Command "(Get-ChildItem -Path '${cwd}' -Recurse | Measure-Object -Property Length -Sum).Sum"`);
                    const totalBytes = parseInt(sizeOutput.trim() || '0', 10);
                    const totalMb = totalBytes / (1024 * 1024);

                    if (totalMb > this.DISK_QUOTA_MB) {
                        isAborted = true;
                        this.killProcessTree(child.pid, executionId);
                        logger.error({ executionId, totalMb }, 'Sandbox runner exceeded disk quota');
                        eventBus.thought(executionId, agentName, `❌ Execution killed: Disk quota exceeded.`);
                    }

                } catch (err) { /* ignore monitor errors */ }
            }, 3000);

            child.stdout.on('data', (data) => {
                const chunk = data.toString();
                if (stdout.length < this.MAX_OUTPUT_SIZE) {
                    stdout += chunk;
                    eventBus.thought(executionId, agentName, chunk.trim());
                } else if (!stdout.endsWith('... [TRUNCATED]')) {
                    stdout += '\n... [TRUNCATED]';
                    eventBus.thought(executionId, agentName, '⚠️ Stdout truncated');
                }
            });

            child.stderr.on('data', (data) => {
                const chunk = data.toString();
                if (stderr.length < this.MAX_OUTPUT_SIZE) {
                    stderr += chunk;
                    eventBus.thought(executionId, agentName, `⚠️ ${chunk.trim()}`);
                }
            });

            child.on('error', (err: any) => {
                clearTimeout(timeout);
                clearInterval(resourceWatchdog);
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
                clearInterval(resourceWatchdog);

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
     * Terminate a process and all its children (Process Tree Kill)
     */
    private static killProcessTree(pid: number | undefined, executionId: string) {
        if (!pid) return;
        logger.info({ pid, executionId }, '[SandboxRunner] 🛡️ Terminating process tree');
        if (process.platform === 'win32') {
            exec(`taskkill /F /T /PID ${pid}`, (err) => {
                if (err) logger.warn({ err, pid }, '[SandboxRunner] taskkill failed');
            });
        } else {
            try { process.kill(-pid, 'SIGKILL'); } catch (err) { /* ignore */ }
        }
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
            const chunk = data.toString().trim();
            if (chunk) eventBus.thought(executionId, agentName, `[Server] ${chunk}`);
        });

        child.stderr?.on('data', (data) => {
            const chunk = data.toString().trim();
            if (chunk) eventBus.thought(executionId, agentName, `[Server Error] ${chunk}`);
        });

        return child;
    }
}
