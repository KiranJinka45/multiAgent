import { Queue } from 'bullmq';
import redis from './redis-client';
import logger from '@config/logger';

export const QUEUE_FREE = 'project-generation-free-v1';
export const QUEUE_PRO = 'project-generation-pro-v1';

// Connection shared across queue and worker
const connection = redis as any;

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

logger.info(`BullMQ Tiered Queues "${QUEUE_FREE}" and "${QUEUE_PRO}" initialized`);
