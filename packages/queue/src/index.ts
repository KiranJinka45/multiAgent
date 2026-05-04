import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import { logger } from '@packages/observability';
import { redis } from '@packages/utils';
import { QUEUE_FREE as Q_FREE, QUEUE_PRO as Q_PRO } from '@packages/utils';

/**
 * DISTRIBUTED QUEUE AUTHORITY
 * Powered by BullMQ for reliable agent task orchestration.
 * Uses the shared Redis connection from @packages/utils.
 */
export const connection = redis;

// Exporting constants from utils for convenience and single source of truth
export const QUEUE_FREE = Q_FREE;
export const QUEUE_PRO = Q_PRO;

export class QueueManager {
    private queue: Queue<any, any, any>;
    private queueEvents: QueueEvents;

    constructor(name: string) {
        this.queue = new Queue(name as any, { connection: connection as any });
        this.queueEvents = new QueueEvents(name, { connection: connection as any });

        this.queueEvents.on('failed', ({ jobId, failedReason }) => {
            logger.error({ jobId, failedReason, queue: name }, 'Job failed in queue');
        });
    }

    async addJob(name: string, data: any, opts: any = {}) {
        const tenantId = data.tenantId || opts.tenantId;
        
        const job = await this.queue.add(name as any, {
            ...data,
            tenantId,
        }, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 2000,
            },
            // Grouping by tenantId for better isolation if the queue supports it
            ...(tenantId ? { jobId: `${tenantId}:${Date.now()}:${Math.random().toString(36).substring(7)}` } : {}),
            ...opts
        });
        return job;
    }

    async getStatus(jobId: string) {
        const job = await Job.fromId(this.queue, jobId);
        return job ? await job.getState() : 'unknown';
    }
}

// Global process registry for Workers
export const createWorker = (name: string, processor: (job: Job) => Promise<any>) => {
    return new Worker(name, processor, { connection: connection as any, concurrency: 10 });
};

// Default options for system reliability
const defaultJobOptions = {
    attempts: 3,
    backoff: {
        type: 'exponential' as const,
        delay: 2000,
    },
    removeOnComplete: true,
    removeOnFail: false,
};

// Standard Queues used by the system
export const freeQueue = new Queue(QUEUE_FREE, { connection: connection as any, defaultJobOptions });
export const proQueue = new Queue(QUEUE_PRO, { connection: connection as any, defaultJobOptions });

// Compatibility Shims
export const buildQueue = freeQueue;
export const plannerQueue = freeQueue;


