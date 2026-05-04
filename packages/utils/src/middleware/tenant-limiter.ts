import { Request, Response, NextFunction } from 'express';
import { redis } from '../server.js';
import { logger } from '@packages/observability';

/**
 * Per-Tenant Rate Limiting Middleware
 * 
 * Uses a sliding window in Redis to track requests per tenant.
 * Defaults to 50 requests per minute per tenant.
 */
export const tenantLimiter = async (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as any;
    const tenantId = authReq.user?.tenantId;

    if (!tenantId) {
        // If not authenticated, we fall back to IP limiting (if configured elsewhere)
        // or just let it pass to standard auth checks.
        return next();
    }

    const limit = 50; // requests
    const windowSeconds = 60; // 1 minute
    const key = `ratelimit:tenant:${tenantId}`;

    try {
        const current = await redis.incr(key);
        if (current === 1) {
            await redis.expire(key, windowSeconds);
        }

        res.setHeader('X-RateLimit-Limit', limit);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - current));

        if (current > limit) {
            logger.warn({ tenantId, path: req.path }, '[TenantLimiter] Rate limit exceeded');
            return res.status(429).json({
                error: 'Too Many Requests',
                message: 'Per-tenant rate limit exceeded. Please slow down.'
            });
        }

        next();
    } catch (err) {
        logger.error({ err, tenantId }, '[TenantLimiter] Failed to process rate limit');
        // Fail open in case of Redis issues
        next();
    }
};
