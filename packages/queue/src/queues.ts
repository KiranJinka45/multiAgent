import { Queue } from 'bullmq';
import { redisConnection } from './connection';

export const buildQueue = new Queue('build', {
  connection: redisConnection as any,
});
