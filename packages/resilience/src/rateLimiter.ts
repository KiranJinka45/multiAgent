import { redis } from '@packages/utils';
import type { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import type { Redis } from 'ioredis';

/**
 * Standard Rate Limiter
 * Uses Redis to store request counts across distributed instances.
 * Lazy initialization to prevent circular dependency crashes.
 */
let _rateLimiter: RateLimiterRedis | null = null;

const getRateLimiter = () => {
    if (!_rateLimiter) {
        const points = parseInt(process.env.RATELIMIT_POINTS || '1000', 10);
        const duration = parseInt(process.env.RATELIMIT_DURATION || '60', 10);
        
        if (!redis) {
            // Fallback for circular dependency during initialization
            return {
                consume: async () => ({})
            } as any;
        }

        _rateLimiter = new RateLimiterRedis({
            storeClient: redis,
            keyPrefix: 'resilience_ratelimit',
            points: points,
            duration: duration,
        });
    }
    return _rateLimiter;
};

// Export a proxy or just the getter?
// To minimize changes in other files, we export a proxy-like object for the main limiter
export const rateLimiter = {
    consume: (key: string | number) => getRateLimiter().consume(key),
    get: (key: string | number) => (getRateLimiter() as any).get(key),
    delete: (key: string | number) => (getRateLimiter() as any).delete(key),
} as any;

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

  async consume(tenantId: string, tier: string, points: number, duration: number) {
    const limiter = this.getLimiter(tier, points, duration);
    try {
      return await limiter.consume(tenantId);
    } catch (err) {
      throw err;
    }
  }
}

/**
 * Higher-level middleware for Express
 */
export async function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
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

// tierRateLimiter also needs to be lazy if redis is not ready
let _tierRateLimiter: MultiTierRateLimiter | null = null;
export const getTierRateLimiter = () => {
    if (!_tierRateLimiter) {
        _tierRateLimiter = new MultiTierRateLimiter(redis as any);
    }
    return _tierRateLimiter;
};

// For backward compatibility, but this might still crash if used at top-level elsewhere
// However, most usages are inside functions.
export const tierRateLimiter = {
    consume: (...args: any[]) => (getTierRateLimiter() as any).consume(...args)
} as any;
