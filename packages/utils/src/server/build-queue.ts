import { Queue, ConnectionOptions } from 'bullmq';
import redis from './redis';
import logger from '@libs/observability';
import { createLazyProxy } from './runtime';

export const QUEUE_FREE = 'project-generation-free-v1';
export const QUEUE_PRO = 'project-generation-pro-v1';

// Connection shared across queue and worker
const connection = redis as unknown as ConnectionOptions;

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
export const freeQueue = createLazyProxy(() => new Queue(QUEUE_FREE, {
    connection,
    defaultJobOptions: defaultOptions,
}), 'Queue_Free');

export const proQueue = createLazyProxy(() => new Queue(QUEUE_PRO, {
    connection,
    defaultJobOptions: defaultOptions,
}), 'Queue_Pro');

if (process.env.NEXT_PHASE !== 'phase-production-build') {
    logger.info(`BullMQ Tiered Queues "${QUEUE_FREE}" and "${QUEUE_PRO}" initialized`);
}
