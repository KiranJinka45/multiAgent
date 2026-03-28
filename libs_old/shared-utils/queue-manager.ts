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
                connection: redis,
                defaultJobOptions: {
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 5000
                    },
                    removeOnComplete: true,
                    removeOnFail: false
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
            const events = new QueueEvents(queueName, { connection: redis });
            this.eventListeners.set(queueName, events);
        }

        this.eventListeners.get(queueName)!.on('completed', ({ jobId, returnvalue }) => {
            callback(jobId, returnvalue);
        });
    }

    async onJobFailed(queueName: string, callback: (jobId: string, error: Error) => void) {
        if (!this.eventListeners.has(queueName)) {
            const events = new QueueEvents(queueName, { connection: redis });
            this.eventListeners.set(queueName, events);
        }

        this.eventListeners.get(queueName)!.on('failed', ({ jobId, failedReason }) => {
            callback(jobId, new Error(failedReason));
        });
    }
}

export const queueManager = new QueueManager();
