import { Queue } from 'bullmq';
import { redis } from '@packages/utils';

export const freeQueue = new Queue('free-tier', { connection: redis });
