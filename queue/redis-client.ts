import Redis from 'ioredis';
import logger from './logger';

const REDIS_URLS = process.env.REDIS_URLS ? process.env.REDIS_URLS.split(',') : [process.env.REDIS_URL || 'redis://localhost:6379'];
const SENTINEL_NAME = process.env.REDIS_SENTINEL_NAME || null;

class RedisClient {
    private static instance: Redis;

    static getInstance(): Redis {
        if (!this.instance) {
            const commonOptions = {
                maxRetriesPerRequest: null, // Critical for BullMQ
                connectTimeout: 5000,       // Fail fast on boot
                retryStrategy: (times: number) => {
                    const isDev = process.env.NODE_ENV !== 'production';
                    // Permanent fix: In dev, retry forever to handle Docker start/stop.
                    // In prod, give up after 20 tries (approx 40s) to allow orchestrator failover.
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
                reconnectOnError: (err) => {
                    const targetError = 'READONLY';
                    if (err.message.includes(targetError)) {
                        return true;
                    }
                    return false;
                },
            };

            if (SENTINEL_NAME) {
                // High Availability: Redis Sentinel
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
                // Standard Single Node or Load Balancer (e.g. Upstash)
                const redisUrl = REDIS_URLS[0];

                // Upstash or secure managed Redis requires TLS
                const isSecure = redisUrl.startsWith('rediss://') || process.env.REDIS_TLS === 'true';

                const connectionOptions: Record<string, unknown> = {
                    ...commonOptions,
                };

                // Critical for Upstash/Managed Redis TLS
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

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, closing Redis...');
    await RedisClient.quit();
});

export const redis = RedisClient.getInstance();
export const independentRedisClients = REDIS_URLS.length > 1 ? RedisClient.getIndependentClients() : [redis];
export default redis;
