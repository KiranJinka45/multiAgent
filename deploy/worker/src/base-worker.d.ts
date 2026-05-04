import { Worker, Job, Queue } from '@packages/utils';
/**
 * BaseWorker
 *
 * Standardized worker for all AI agents.
 */
export declare abstract class BaseWorker {
    protected worker: Worker;
    protected dlq: Queue;
    protected breaker: any;
    constructor(queueName: string);
    protected abstract processJob(job: Job): Promise<unknown>;
    abstract getName(): string;
    abstract getWorkerId(): string;
}
