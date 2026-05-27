import { Worker } from 'node:worker_threads';

export interface WorkerSandboxOptions {
    memoryLimitMb?: number;
    timeoutMs?: number;
}

export class WorkerSandbox {
    /**
     * Executes a module script in an isolated worker thread with memory limits.
     */
    public static async executeWorker(
        workerCode: string,
        options: WorkerSandboxOptions = {}
    ): Promise<any> {
        return new Promise((resolve, reject) => {
            // Create in-memory Data URI representing the worker script
            const scriptUri = `data:text/javascript;base64,${Buffer.from(workerCode).toString('base64')}`;
            
            const worker = new Worker(new URL(scriptUri), {
                resourceLimits: {
                    maxOldGenerationSizeMb: options.memoryLimitMb || 50,
                    maxYoungGenerationSizeMb: Math.max(16, Math.floor((options.memoryLimitMb || 50) / 4))
                }
            });

            let completed = false;

            // Timeout timer fence
            const timer = setTimeout(() => {
                if (!completed) {
                    completed = true;
                    worker.terminate();
                    reject(new Error(`[WORKER::TIMEOUT] Worker execution exceeded limit of ${options.timeoutMs || 5000}ms`));
                }
            }, options.timeoutMs || 5000);

            worker.on('message', (result) => {
                if (!completed) {
                    completed = true;
                    clearTimeout(timer);
                    resolve(result);
                }
            });

            worker.on('error', (err) => {
                if (!completed) {
                    completed = true;
                    clearTimeout(timer);
                    reject(err);
                }
            });

            worker.on('exit', (code) => {
                if (!completed) {
                    completed = true;
                    clearTimeout(timer);
                    if (code !== 0) {
                        reject(new Error(`[WORKER::CRASH] Worker exited unexpectedly with code: ${code}`));
                    }
                }
            });
        });
    }
}
