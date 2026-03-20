import { Queue, QueueEvents } from 'bullmq';
import redis from './services/redis';
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
                    attempts: 5,
                    backoff: {
                        type: 'exponential',
                        delay: 10000 // Start with 10s
                    },
                    removeOnComplete: {
                        age: 3600 * 24, // Keep for 24h
                        count: 1000
                    },
                    removeOnFail: {
                        age: 3600 * 24 * 7, // Keep failed for 7 days (DLQ behavior)
                        count: 5000
                    }
                }
            });
            this.queues.set(name, queue);
        }
        return this.queues.get(name)!;
    }

    async addJob(queueName: string, data: any, jobId?: string) {
        const queue = this.getQueue(queueName);
        const job = await queue.add(queueName, data, { jobId });
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
