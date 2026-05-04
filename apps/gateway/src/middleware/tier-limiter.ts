import { Request, Response, NextFunction } from 'express';
import { tierRateLimiter } from '@packages/resilience';
import { BillingEnforcer } from '@packages/billing';
import { logger } from '@packages/observability';

/**
 * Tier-Aware Rate Limiting Middleware
 * Enforces request quotas based on the tenant's commercial tier (Free/Pro/Enterprise).
 */
export async function tierLimitMiddleware(req: Request, res: Response, next: NextFunction) {
    const tenantId = (req as any).tenantId || req.header('X-Tenant-Id');

    if (!tenantId) {
        // Fallback to global rate limiter if no tenant identified
        return next();
    }

    try {
        // 1. Resolve Tier & Limits
        const plan = await BillingEnforcer.getPlan(tenantId);
        const limit = BillingEnforcer.LIMITS[plan];

        // 2. Consume Rate Limit Points
        await tierRateLimiter.consume(tenantId, plan, limit.points, limit.duration);
        
        next();
    } catch (err: any) {
        if (err.msBeforeNext !== undefined) {
            const resetInMs = err.msBeforeNext;
            const plan = await BillingEnforcer.getPlan(tenantId);
            
            const suggestedAction = plan === 'free' ? 'UPGRADE to Pro for 10x higher limits.' : 'RETRY after the reset period.';

            logger.warn({ tenantId, plan, resetInMs }, '[Enforcement] Tier rate limit exceeded');

            return res.status(429).json({
                error: "Quota Exceeded",
                message: `You have exceeded the rate limit for the ${plan.toUpperCase()} tier.`,
                resetInMs,
                suggestedAction,
                documentation: "https://docs.multiagent.io/pricing"
            });
        }

        logger.error({ err, tenantId }, '[Enforcement] Rate limiter error');
        next(); // Fail open for system errors
    }
}
