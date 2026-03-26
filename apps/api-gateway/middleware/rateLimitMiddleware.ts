import { Request, Response, NextFunction } from "express";
import { RateLimiter } from "@libs/resilience";
import { redis } from "@libs/shared-services/redis";

const limiter = new RateLimiter(redis, "api-gateway", 100, 60); // 100 requests per minute

/**
 * Middleware to apply rate limiting to Express routes.
 * Identifies users by IP address or Authorization header.
 */
export async function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const key = req.headers.authorization || req.ip || "anonymous";

  try {
    await limiter.consume(key);
    next();
  } catch (err) {
    res.status(429).json({
      error: "Too Many Requests",
      message: "Please slow down. You have exceeded your rate limit.",
    });
  }
}
