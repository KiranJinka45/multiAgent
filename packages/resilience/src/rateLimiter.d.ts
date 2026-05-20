import type { Request, Response, NextFunction } from 'express';
import type { Redis } from 'ioredis';
export declare const rateLimiter: any;
/**
 * RateLimiter wrapper for api-gateway
 */
export declare class RateLimiter {
    private limiter;
    constructor(client: Redis, keyPrefix: string, points: number, duration: number);
    consume(key: string): Promise<import("rate-limiter-flexible").RateLimiterRes>;
}
/**
 * Multi-Tier Rate Limiter
 * Dynamically adjusts limits based on Tenant Tier (Free/Pro/Enterprise)
 */
export declare class MultiTierRateLimiter {
    private client;
    private limiters;
    constructor(client: Redis);
    private getLimiter;
    consume(tenantId: string, tier: string, points: number, duration: number): Promise<import("rate-limiter-flexible").RateLimiterRes>;
}
/**
 * Higher-level middleware for Express
 */
export declare function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare const getTierRateLimiter: () => MultiTierRateLimiter;
export declare const tierRateLimiter: any;
//# sourceMappingURL=rateLimiter.d.ts.map