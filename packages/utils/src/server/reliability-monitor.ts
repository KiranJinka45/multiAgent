import { redis } from './redis';
import logger from '@libs/observability';

export interface ErrorEvent {
    service: string;
    error: string;
    stack?: string;
    executionId?: string;
    context?: Record<string, unknown>;
    timestamp: string;
}

export class ReliabilityMonitor {
    private static ERROR_KEY_PREFIX = 'system:errors:';
    private static HOURLY_STATS_KEY = 'system:errors:hourly';

    /**
     * Records a system error in Redis for centralized tracking.
     */
    static async recordError(event: ErrorEvent): Promise<void> {
        const { service, error, executionId, timestamp } = event;
        
        try {
            // 1. Log structured error (Pino will handle correlationId via mixin)
            logger.error(event, `[ReliabilityMonitor] Captured error in ${service}`);

            // 2. Increment service-specific error counter
            await redis.hincrby(`${this.ERROR_KEY_PREFIX}counts`, service, 1);

            // 3. Store recent errors in a caped list (last 100 errors)
            const listKey = `${this.ERROR_KEY_PREFIX}recent`;
            await redis.lpush(listKey, JSON.stringify(event));
            await redis.ltrim(listKey, 0, 99);

            // 4. Update hourly statistics
            const hourSlot = new Date(timestamp).toISOString().substring(0, 13); // YYYY-MM-DDTHH
            await redis.hincrby(this.HOURLY_STATS_KEY, `${service}:${hourSlot}`, 1);

            // 5. If it's a critical worker failure, notify via Redis channel
            if (service === 'worker' && executionId) {
                await redis.publish('system:alerts', JSON.stringify({
                    type: 'WORKER_FAILURE',
                    executionId,
                    error
                }));
            }
        } catch (err) {
            // Fallback to console if Redis fails, to avoid losing the error
            console.error('[ReliabilityMonitor] Failed to record error:', err);
        }
    }

    /**
     * Records the start of a build.
     */
    static async recordStart(): Promise<void> {
        try {
            await redis.hincrby(`${this.ERROR_KEY_PREFIX}counts`, 'builds_started', 1);
        } catch (err) {
            logger.warn({ err }, '[ReliabilityMonitor] Failed to record build start');
        }
    }

    /**
     * Records a successful build.
     */
    static async recordSuccess(durationMs: number): Promise<void> {
        try {
            await redis.hincrby(`${this.ERROR_KEY_PREFIX}counts`, 'builds_success', 1);
            // track average duration in Redis
            await redis.lpush('system:builds:durations', durationMs.toString());
            await redis.ltrim('system:builds:durations', 0, 99);
        } catch (err) {
            logger.warn({ err }, '[ReliabilityMonitor] Failed to record build success');
        }
    }

    /**
     * Records a failed build.
     */
    static async recordFailure(): Promise<void> {
        try {
            await redis.hincrby(`${this.ERROR_KEY_PREFIX}counts`, 'builds_failure', 1);
        } catch (err) {
            logger.warn({ err }, '[ReliabilityMonitor] Failed to record build failure');
        }
    }

    static async getStats() {
        return await redis.hgetall(`${this.ERROR_KEY_PREFIX}counts`);
    }

    static async getRecentErrors(count: number = 10): Promise<ErrorEvent[]> {
        const raw = await redis.lrange(`${this.ERROR_KEY_PREFIX}recent`, 0, count - 1);
        return raw.map(r => JSON.parse(r));
    }
}

export default ReliabilityMonitor;
