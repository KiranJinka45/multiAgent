import { Queue, Worker, QueueEvents } from 'bullmq';
import redis from './redis';
import logger from './logger';

export const QUEUE_NAME = 'project-generation-v1';

// Connection shared across queue and worker
const connection = redis;

// 1. Initialize Queue
export const generationQueue = new Queue(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000,
        },
        removeOnComplete: {
            age: 3600, // keep for 1 hour
            count: 1000,
        },
        removeOnFail: {
            age: 24 * 3600, // keep for 24 hours
        },
    },
});

// 2. Initialize Queue Events (for progress tracking in this instance if needed)
export const queueEvents = new QueueEvents(QUEUE_NAME, { connection });

logger.info(`BullMQ Queue "${QUEUE_NAME}" initialized`);
