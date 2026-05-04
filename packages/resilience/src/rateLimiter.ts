import { redis } from '@packages/utils';
import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import type { Redis } from 'ioredis';


/**
 * Standard Rate Limiter
 * Uses Redis to store request counts across distributed instances.
 * Adaptive: Prioritizes environment variables for production flexibility.
 */
const points = parseInt(process.env.RATELIMIT_POINTS || '1000', 10);
const duration = parseInt(process.env.RATELIMIT_DURATION || '60', 10);

export const rateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'resilience_ratelimit',
  points: points,
  duration: duration,
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
 * Multi-Tier Rate Limiter
 * Dynamically adjusts limits based on Tenant Tier (Free/Pro/Enterprise)
 */
export class MultiTierRateLimiter {
  private limiters = new Map<string, RateLimiterRedis>();

  constructor(private client: Redis) {}

  private getLimiter(tier: string, points: number, duration: number) {
    const key = `${tier}:${points}:${duration}`;
    if (!this.limiters.has(key)) {
      this.limiters.set(key, new RateLimiterRedis({
        storeClient: this.client,
        keyPrefix: `resilience_tier_${tier}`,
        points,
        duration,
      }));
    }
    return this.limiters.get(key)!;
  }

  /**
   * Consumes points for a tenant based on their tier.
   * Throws RateLimiterRes error if limit is exceeded.
   */
  async consume(tenantId: string, tier: string, points: number, duration: number) {
    const limiter = this.getLimiter(tier, points, duration);
    try {
      return await limiter.consume(tenantId);
    } catch (err) {
      // Re-throw to be caught by middleware
      throw err;
    }
  }
}

/**
 * Higher-level middleware for Express
 */
export async function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // Phase 15: Prioritize User-ID based limiting for enterprise-grade protection
    const userId = (req as any).user?.id || (req as any).user?.tenantId;
    const key = userId ? `user:${userId}` : `ip:${req.ip || 'unknown'}`;
    
    await rateLimiter.consume(key);
    return next();
  } catch (rejRes) {
    res.status(429).json({
      error: 'Too Many Requests',
      retryAfter: Math.round((rejRes as any).msBeforeNext / 1000) || 60,
    });
  }
}

export const tierRateLimiter = new MultiTierRateLimiter(redis as any);
