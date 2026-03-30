import { spawn } from 'child_process';
import { getExecutionLogger } from '@packages/utils/server';
import { RuntimeGuard } from './runtimeGuard';

export interface ExecutionOptions {
    cwd: string;
    executionId: string;
    timeoutMs?: number;
    env?: NodeJS.ProcessEnv;
}

export interface ProcessExecutionResult {
    success: boolean;
    stdout: string;
    stderr: string;
    code: number | null;
    error?: string;
}

export const runtimeExecutor = {
    async execute(command: string, args: string[], options: ExecutionOptions): Promise<ProcessExecutionResult> {
        const elog = getExecutionLogger(options.executionId);
        const start = Date.now();
        
        elog.info({ command, args, cwd: options.cwd }, 'Runtime: Executing command');

        return new Promise((resolve) => {
            let stdout = '';
            let stderr = '';
            
            const child = spawn(command, args, RuntimeGuard.safeSpawnOptions(options.cwd, options.env as Record<string, string>));

            const timeout = options.timeoutMs ? setTimeout(() => {
                child.kill();
                resolve({
                    success: false,
                    stdout,
                    stderr,
                    code: null,
                    error: `Execution timed out after ${options.timeoutMs}ms`
                });
            }, options.timeoutMs) : null;

            child.stdout.on('data', (data) => {
                const chunk = data.toString();
                stdout += chunk;
                // Optional: stream to realtime bus if needed
            });

            child.stderr.on('data', (data) => {
                const chunk = data.toString();
                stderr += chunk;
            });

            child.on('close', (code) => {
                if (timeout) clearTimeout(timeout);
                const duration = Date.now() - start;
                
                elog.info({ code, durationMs: duration }, 'Runtime: Command finished');

                resolve({
                    success: code === 0,
                    stdout,
                    stderr,
                    code,
                    error: code !== 0 ? `Command failed with code ${code}` : undefined
                });
            });

            child.on('error', (err) => {
                if (timeout) clearTimeout(timeout);
                elog.error({ err }, 'Runtime: Spawn error');
                resolve({
                    success: false,
                    stdout,
                    stderr,
                    code: null,
                    error: err.message
                });
            });
        });
    }
};
