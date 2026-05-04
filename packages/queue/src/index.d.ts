import { Queue, Worker, Job } from 'bullmq';
/**
 * DISTRIBUTED QUEUE AUTHORITY
 * Powered by BullMQ for reliable agent task orchestration.
 * Uses the shared Redis connection from @packages/utils.
 */
export declare const connection: any;
export declare const QUEUE_FREE = "free_queue";
export declare const QUEUE_PRO = "pro-queue";
export declare class QueueManager {
    private queue;
    private queueEvents;
    constructor(name: string);
    addJob(name: string, data: any, opts?: any): Promise<Job<any, any, any>>;
    getStatus(jobId: string): Promise<"unknown" | import("bullmq").JobState>;
}
export declare const createWorker: (name: string, processor: (job: Job) => Promise<any>) => Worker<any, any, string>;
export declare const freeQueue: Queue<any, any, string, any, any, string>;
export declare const proQueue: Queue<any, any, string, any, any, string>;
export declare const buildQueue: Queue<any, any, string, any, any, string>;
export declare const plannerQueue: Queue<any, any, string, any, any, string>;
//# sourceMappingURL=index.d.ts.map