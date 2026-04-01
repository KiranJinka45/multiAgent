import Redis from 'ioredis';
import { createLazyProxy } from '@packages/utils/server';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = createLazyProxy(() => {
  return new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    reconnectOnError: () => false, // 🔥 Fix: Stop uncontrolled connection recursion
    retryStrategy: (times: number) => {
      if (times > 5) {
        console.error('❌ [Redis_Shared] Retry limit reached (5). Halting connection storm.');
        return null; // 🔥 Fix: Hard stop on retries to prevent ENOBUFS
      }
      return Math.min(times * 200, 2000); // Exponential backoff
    },
    keepAlive: 10000,
  });
}, 'Redis_Shared');

export default redis;
