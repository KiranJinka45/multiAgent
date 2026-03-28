import { RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';
import { logger } from '@packages/observability';
import { Request, Response, NextFunction } from 'express';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});

redis.on('error', (err) => {
  logger.error({ err, url: redisUrl }, '[Resilience] Redis Connection Error');
});

/**
 * Standard Rate Limiter
 * Uses Redis to store request counts across distributed instances.
 */
export const rateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'resilience_ratelimit',
  points: 100, // Number of points
  duration: 60, // Per 60 seconds
});

/**
 * RateLimiter wrapper for api-gateway
 */
export class RateLimiter {
  private limiter: RateLimiterRedis;
  
  constructor(client: Redis, keyPrefix: string, points: number, duration: number) {
    this.limiter = new RateLimiterRedis({
      storeClient: client,
      keyPrefix: `resilience_${keyPrefix}`,
      points,
      duration,
    });
  }

  async consume(key: string) {
    return this.limiter.consume(key);
  }
}

/**
 * Higher-level middleware for Express
 */
export async function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const ip = req.ip || 'unknown';
    await rateLimiter.consume(ip);
    next();
  } catch (rejRes) {
    res.status(429).json({
      error: 'Too Many Requests',
      retryAfter: Math.round((rejRes as any).msBeforeNext / 1000) || 60,
    });
  }
}
