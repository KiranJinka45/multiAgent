import { Queue, ConnectionOptions } from 'bullmq';
import redis from './redis';
import { logger } from '@packages/observability';
import { createLazyProxy } from './runtime';

export const QUEUE_FREE = 'project-generation-free-v1';
export const QUEUE_PRO = 'project-generation-pro-v1';

const connection = redis as unknown as ConnectionOptions;

const defaultOptions = {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: false,
    removeOnFail: { age: 24 * 3600 },
};

export const freeQueue = createLazyProxy(() => new Queue(QUEUE_FREE, {
    connection,
    defaultJobOptions: defaultOptions,
}), 'Queue_Free');

export const proQueue = createLazyProxy(() => new Queue(QUEUE_PRO, {
    connection,
    defaultJobOptions: defaultOptions,
}), 'Queue_Pro');

if (process.env.NEXT_PHASE !== 'phase-production-build') {
    if (logger && typeof logger.info === 'function') {
        logger.info('BullMQ Tiered Queues initialized');
    } else {
        console.log('[Queue System] BullMQ Tiered Queues initialized (logger not ready)');
    }
}
