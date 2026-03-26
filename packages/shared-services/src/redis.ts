import Redis from 'ioredis';
import { createLazyProxy } from '@libs/utils/server';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = createLazyProxy(() => {
  return new Redis(redisUrl, {
    maxRetriesPerRequest: null,
  });
}, 'Redis_Shared');

export default redis;
