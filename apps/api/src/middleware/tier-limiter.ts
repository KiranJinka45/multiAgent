import { Response, NextFunction } from "express";
import { BillingEnforcer } from "@packages/billing";
import { tierRateLimiter } from "@packages/resilience";
import { logger } from "@packages/observability";
import { AuthenticatedRequest } from "./auth";

/**
 * Tier-Aware Rate Limiting Middleware
 * Enforces API constraints based on the Tenant's commercial plan (Free/Pro/Enterprise).
 */
export async function tierLimitMiddleware(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    if (!req.user || !req.user.tenantId) {
        return next(); // Skip if not authenticated or no tenant
    }

    const tenantId = req.user.tenantId;

    try {
        // 1. Resolve Tenant Plan
        const plan = await BillingEnforcer.getPlan(tenantId);
        const limit = BillingEnforcer.LIMITS[plan];

        // 2. Consume Rate Limit Points
        await tierRateLimiter.consume(tenantId, plan, limit.points, limit.duration);
        
        next();
    } catch (err) {
        if (err instanceof Error) {
            logger.error({ err, tenantId }, "[RESILIENCE] Tier Rate Limiter Error");
            return next(); // Fail open on internal errors
        }

        // Rate Limit Exceeded
        logger.warn({ tenantId }, "[RESILIENCE] Rate Limit Exceeded");
        res.status(429).json({
            error: "Too Many Requests",
            message: "You have exceeded your plan's rate limit. Upgrade for higher throughput.",
            retryAfter: Math.round((err as any).msBeforeNext / 1000) || 60
        });
    }
}
