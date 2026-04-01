import { Queue, QueueEvents } from 'bullmq';
import redis from './redis';
import logger from './logger';

/**
 * QueueManager
 * 
 * Centralized BullMQ management for the Aion platform.
 * Handles job submission, event tracking, and retry policies.
 */
export class QueueManager {
    private queues: Map<string, Queue> = new Map();
    private eventListeners: Map<string, QueueEvents> = new Map();

    private getQueue(name: string): Queue {
        if (!this.queues.has(name)) {
            const queue = new Queue(name, { 
                connection: redis as any,
                defaultJobOptions: {
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 5000 // 5s initial delay
                    },
                    removeOnComplete: {
                        age: 3600, // Keep completed jobs for 1 hour
                        count: 100
                    },
                    removeOnFail: {
                        age: 24 * 3600 // Keep failed jobs for 24 hours
                    }
                }
            });
            this.queues.set(name, queue);
        }
        return this.queues.get(name)!;
    }

    async moveToDLQ(job: any, error: Error) {
        const dlqName = 'dead-letter-queue';
        const dlq = this.getQueue(dlqName);
        
        await dlq.add(job.name, {
            originalQueue: job.queueName,
            originalData: job.data,
            failedReason: error.message,
            stack: error.stack,
            failedAt: new Date().toISOString(),
            originalJobId: job.id,
            attemptsMade: job.attemptsMade
        }, { 
            jobId: `dlq_${job.id}_${Date.now()}`,
            removeOnComplete: false,
            removeOnFail: false
        });

        logger.warn({ jobId: job.id, dlqName, error: error.message }, '[QueueManager] Job moved to DLQ');
    }

    async addJob(queueName: string, data: any, jobId?: string) {
        const queue = this.getQueue(queueName);
        const options = jobId ? { jobId } : {};
        const job = await queue.add(queueName, data, options);
        logger.info({ queueName, jobId: job.id }, '[QueueManager] Job added');
        return job;
    }

    async onJobCompleted(queueName: string, callback: (jobId: string, result: any) => void) {
        if (!this.eventListeners.has(queueName)) {
            const events = new QueueEvents(queueName, { connection: redis as any });
            this.eventListeners.set(queueName, events);
        }

        this.eventListeners.get(queueName)!.on('completed', ({ jobId, returnvalue }) => {
            callback(jobId, returnvalue);
        });
    }

    async onJobFailed(queueName: string, callback: (jobId: string, error: Error) => void) {
        if (!this.eventListeners.has(queueName)) {
            const events = new QueueEvents(queueName, { connection: redis as any });
            this.eventListeners.set(queueName, events);
        }

        this.eventListeners.get(queueName)!.on('failed', ({ jobId, failedReason }) => {
            callback(jobId, new Error(failedReason));
        });
    }
}

export const queueManager = new QueueManager();
