import { RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';
import { logger } from '@libs/observability';

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
 * Higher-level middleware for Express
 */
export async function rateLimitMiddleware(req: any, res: any, next: any) {
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
