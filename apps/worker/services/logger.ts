import Redis from 'ioredis';
import logger from '@packages/packages/utils/config/logger';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(REDIS_URL);

export async function publishLog(buildId: string, message: string, level: 'info' | 'error' | 'warn' = 'info') {
    const logEntry = {
        buildId,
        message,
        level,
        timestamp: new Date().toISOString()
    };

    logger.info({ buildId, message }, '[WorkerLogger] Publishing log');
    
    try {
        await redis.publish('build-logs', JSON.stringify(logEntry));
    } catch (err: any) {
        logger.error({ err }, '[WorkerLogger] Failed to publish log to Redis');
    }
}
