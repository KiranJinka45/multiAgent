import logger from '@config/logger';

/**
 * WorkerPool - Manages global concurrency for agent tasks.
 * Prevents system exhaustion by limiting the number of parallel AI calls.
 */
export class WorkerPool {
    private static instance: WorkerPool;
    private activeCount = 0;
    private maxConcurrency: number;
    private queue: (() => void)[] = [];

    private constructor(maxConcurrency: number = 5) {
        this.maxConcurrency = maxConcurrency;
    }

    public static getInstance(): WorkerPool {
        if (!WorkerPool.instance) {
            WorkerPool.instance = new WorkerPool();
        }
        return WorkerPool.instance;
    }

    /**
     * Executes a task within the pool's concurrency limits.
     */
    async run<T>(task: () => Promise<T>): Promise<T> {
        if (this.activeCount >= this.maxConcurrency) {
            logger.info({ queueLength: this.queue.length }, '[WorkerPool] Max concurrency reached. Queuing task.');
            await new Promise<void>(resolve => this.queue.push(resolve));
        }

        this.activeCount++;
        try {
            return await task();
        } finally {
            this.activeCount--;
            this.next();
        }
    }

    private next() {
        if (this.queue.length > 0 && this.activeCount < this.maxConcurrency) {
            const resolve = this.queue.shift();
            if (resolve) resolve();
        }
    }

    public getStatus() {
        return {
            active: this.activeCount,
            queued: this.queue.length,
            max: this.maxConcurrency
        };
    }
}

export const workerPool = WorkerPool.getInstance();
