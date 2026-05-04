import { Redis } from 'ioredis';
import { logger } from '@packages/observability';
import { serverConfig as env } from '@packages/config';

/**
 * GLOBAL CIRCUIT BREAKER
 * Synchronizes failure state across all cluster nodes via Redis.
 * Prevents cascading failures by halting non-critical ingestion during outages.
 */
export class CircuitBreaker {
  private static readonly STATE_KEY = 'system:circuit_breaker:state';
  private static readonly REASON_KEY = 'system:circuit_breaker:reason';
  private static readonly PROBE_COUNT = 'system:circuit_breaker:probe_count';

  private static redis: Redis;

  static setRedis(redis: Redis) {
    this.redis = redis;
  }

  private static getRedis(): Redis {
    if (!this.redis) {
      this.redis = new Redis(env.REDIS_URL || 'redis://localhost:6379');
    }
    return this.redis;
  }

  /**
   * Checks if the circuit is currently allowing traffic.
   */
  static async allowRequest(): Promise<boolean> {
    const redis = this.getRedis();
    const state = await redis.get(this.STATE_KEY) || 'CLOSED';

    if (state === 'CLOSED') return true;
    if (state === 'OPEN') {
      const ttl = await redis.ttl(this.STATE_KEY);
      if (ttl <= 0) {
        await redis.set(this.STATE_KEY, 'HALF_OPEN');
        return true; 
      }
      return false;
    }

    if (state === 'HALF_OPEN') {
      return Math.random() < 0.1;
    }

    return true;
  }

  /**
   * Trips the circuit breaker to OPEN state.
   */
  static async trip(reason: string, durationSeconds: number = 60) {
    const redis = this.getRedis();
    logger.error({ reason, durationSeconds }, '🚨 CIRCUIT BREAKER: OPEN');
    
    await redis.set(this.STATE_KEY, 'OPEN', 'EX', durationSeconds);
    await redis.set(this.REASON_KEY, reason, 'EX', durationSeconds);
    await redis.del(this.PROBE_COUNT);
  }

  /**
   * Success signal from a probe request.
   */
  static async recordSuccess() {
    const redis = this.getRedis();
    const state = await redis.get(this.STATE_KEY);

    if (state === 'HALF_OPEN') {
      const count = await redis.incr(this.PROBE_COUNT);
      if (count >= 10) {
        await this.reset();
        logger.info('✅ CIRCUIT BREAKER: CLOSED (Recovery Successful)');
      }
    }
  }

  /**
   * Manually resets the circuit breaker.
   */
  static async reset() {
    const redis = this.getRedis();
    await redis.del(this.STATE_KEY);
    await redis.del(this.REASON_KEY);
    await redis.del(this.PROBE_COUNT);
  }

  static async getReason(): Promise<string | null> {
    return this.getRedis().get(this.REASON_KEY);
  }
}
