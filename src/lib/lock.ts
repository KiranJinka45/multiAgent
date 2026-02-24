import Redlock from 'redlock';
import { independentRedisClients } from './redis';
import logger from './logger';

// 1. Initialize Redlock
const redlock = new Redlock(
    // Provide multiple independent clients for high availability (Minimum 3 for strict distributed safety)
    independentRedisClients,
    {
        // The expected clock drift; for more check http://redis.io/topics/distlock
        driftFactor: 0.01, // time in ms

        // The max number of times Redlock will attempt to lock a resource
        // before erroring.
        retryCount: 10,

        // the time in ms between attempts
        retryDelay: 200, // time in ms

        // the max time in ms randomly added to retries
        // to improve performance under high contention
        // see https://www.iana.org/assignments/iana-p-parameters/iana-p-parameters.xhtml
        retryJitter: 200, // time in ms

        // The minimum remaining time on a lock before a renewal is attempted.
        automaticExtensionThreshold: 500, // time in ms
    }
);

redlock.on('error', (error: any) => {
    // Ignore cases where a resource is already locked.
    if (error && (error.name === 'ExecutionError' || error.message?.includes('locked'))) {
        return;
    }
    logger.error({ error }, 'Redlock error');
});

export async function withLock<T>(
    executionId: string,
    fn: () => Promise<T>,
    ttl = 30000 // 30 seconds default
): Promise<T> {
    const resource = `locks:execution:${executionId}`;

    logger.info({ executionId, resource }, 'Attempting to acquire distributed lock');

    const lock = await redlock.acquire([resource], ttl);

    try {
        logger.info({ executionId, resource }, 'Distributed lock acquired');
        return await fn();
    } finally {
        logger.info({ executionId, resource }, 'Releasing distributed lock');
        await lock.release();
    }
}

export default redlock;
