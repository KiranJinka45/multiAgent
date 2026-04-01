import Redis from 'ioredis';
import { logger } from '@packages/observability';

const REDIS_URLS = (process.env.REDIS_URLS || 'redis://localhost:6379').split(',');
const SENTINEL_NAME = process.env.REDIS_SENTINEL_NAME;

class RedisClient {
    private static instance: Redis;

    public static getInstance(): Redis {
        if (!RedisClient.instance) {
            const commonOptions = {
                maxRetriesPerRequest: null,
                connectTimeout: 5000,
                retryStrategy: (times: number) => {
                    const delay = Math.min(times * 100, 3000);
                    if (logger && typeof logger.warn === 'function') {
                        logger.warn({ times, nextRetryIn: delay }, 'Redis reconnecting...');
                    }
                    return delay;
                },
            };

            if (SENTINEL_NAME) {
                const sentinels = REDIS_URLS.map(url => {
                    const u = new URL(url);
                    return { host: u.hostname, port: parseInt(u.port) };
                });
                RedisClient.instance = new Redis({
                    sentinels,
                    name: SENTINEL_NAME,
                    ...commonOptions,
                });
            } else {
                RedisClient.instance = new Redis(REDIS_URLS[0], commonOptions);
            }
        }
        return RedisClient.instance;
    }
}

export const redis = RedisClient.getInstance();
export default redis;

export const DEPLOYMENT_QUEUE = 'deployment';
export const QUEUE_FREE = 'build-free';
export const QUEUE_PRO = 'build-pro';
