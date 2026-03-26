import Redis from 'ioredis';
import { logger } from '@libs/observability';
import { createLazyProxy } from './runtime';

const REDIS_URLS = process.env.REDIS_URLS ? process.env.REDIS_URLS.split(',') : [process.env.REDIS_URL || 'redis://localhost:6379'];
const SENTINEL_NAME = process.env.REDIS_SENTINEL_NAME || null;

export const DEPLOYMENT_QUEUE = 'deployment';

class RedisClient {
    private static instance: Redis;

    static getInstance(): Redis {
        if (!this.instance) {
            const commonOptions = {
                maxRetriesPerRequest: null, // Critical for BullMQ
                connectTimeout: 5000,       // Fail fast on boot
                retryStrategy: (times: number) => {
                    const isDev = process.env.NODE_ENV !== 'production';
                    if (!isDev && times > 20) {
                        logger.error('Redis connection failed permanently. Halting.');
                        return null;
                    }
                    const delay = Math.min(times * 100, 3000);
                    if (times % 5 === 0) {
                        logger.warn({ times, nextRetryIn: delay }, 'Redis unreachable. Retrying...');
                    }
                    return delay;
                },
                reconnectOnError: (err: unknown) => {
                    const targetError = 'READONLY';
                    if (err.message.includes(targetError)) {
                        return true;
                    }
                    return false;
                },
            };

            if (SENTINEL_NAME) {
                const sentinels = REDIS_URLS.map(url => {
                    const parsed = new URL(url);
                    return { host: parsed.hostname, port: Number(parsed.port) };
                });
                this.instance = new Redis({
                    sentinels,
                    name: SENTINEL_NAME,
                    ...commonOptions
                });
            } else {
                const redisUrl = REDIS_URLS[0];
                const isSecure = redisUrl.startsWith('rediss://') || process.env.REDIS_TLS === 'true';
                const connectionOptions: Record<string, unknown> = {
                    ...commonOptions,
                };
                if (isSecure) {
                    connectionOptions.tls = { rejectUnauthorized: false };
                }
                logger.info({ isSecure, urlPrefix: redisUrl.substring(0, 8) }, 'Initializing Redis Connection');
                this.instance = new Redis(redisUrl, connectionOptions);
            }

            this.instance.on('connect', () => logger.info('Redis connected successfully'));
            this.instance.on('ready', () => logger.info('Redis ready to receive commands'));
            this.instance.on('error', (err) => logger.error({ err: err.message || err }, 'Redis connection error'));
        }
        return this.instance;
    }

    static async quit() {
        if (this.instance) {
            await this.instance.quit();
            logger.info('Redis connection closed');
        }
    }
    static getIndependentClients(): Redis[] {
        const commonOptions = { maxRetriesPerRequest: null, connectTimeout: 5000 };
        return REDIS_URLS.map(url => new Redis(url, commonOptions));
    }
}

process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, closing Redis...');
    await RedisClient.quit();
});

export const redis = createLazyProxy(() => RedisClient.getInstance(), 'Redis');
export const independentRedisClients = createLazyProxy(() => 
    REDIS_URLS.length > 1 ? RedisClient.getIndependentClients() : [redis], 
    'IndependentRedisClients'
);
export default redis;
