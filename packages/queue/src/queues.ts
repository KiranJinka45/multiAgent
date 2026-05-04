import { Queue } from 'bullmq';
import { redisConnection } from './connection.js';

export const buildQueue = new Queue('build', {
  connection: redisConnection as any,
});

