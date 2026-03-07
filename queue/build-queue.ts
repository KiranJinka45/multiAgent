import { Queue, QueueEvents } from 'bullmq';
import redis from './redis-client';
import logger from '@configs/logger';

export const QUEUE_FREE = 'project-generation-free-v1';
export const QUEUE_PRO = 'project-generation-pro-v1';

// Connection shared across queue and worker
const connection = redis;

const defaultOptions = {
    attempts: 3,
    backoff: {
        type: 'exponential' as const,
        delay: 5000,
    },
    removeOnComplete: false, // Audit trail
    removeOnFail: {
        age: 24 * 3600, // keep for 24 hours
    },
};

// 1. Initialize Queues
export const freeQueue = new Queue(QUEUE_FREE, {
    connection,
    defaultJobOptions: defaultOptions,
});

export const proQueue = new Queue(QUEUE_PRO, {
    connection,
    defaultJobOptions: defaultOptions,
});

// 2. Initialize Queue Events
export const freeQueueEvents = new QueueEvents(QUEUE_FREE, { connection });
export const proQueueEvents = new QueueEvents(QUEUE_PRO, { connection });

logger.info(`BullMQ Tiered Queues "${QUEUE_FREE}" and "${QUEUE_PRO}" initialized`);
