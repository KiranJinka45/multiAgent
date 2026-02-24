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
                    if (this.instance.status === 'connecting' && times > 5) {
                        logger.error('Redis connection failed on boot. Continuing in fail-soft mode (In-memory fallback not available, APIs will return service unavailable).');
                        // In production, we might still want to exit, but for dev/beta, we allow boot to show errors.
                        if (process.env.NODE_ENV === 'production') {
                            process.exit(1);
                        }
                        return null; // Stop retrying
                    }
                    const delay = Math.min(times * 50, 2000);
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
                // Standard Single Node or Load Balancer
                this.instance = new Redis(REDIS_URLS[0], commonOptions);
            }

            this.instance.on('connect', () => logger.info('Redis connected'));
            this.instance.on('error', (err) => logger.error({ err }, 'Redis error'));
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
