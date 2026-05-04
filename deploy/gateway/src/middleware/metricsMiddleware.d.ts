import { Request, Response, NextFunction } from 'express';
/**
 * Metrics Middleware
 * Tracks latency, method, route, and status code using the shared observability library.
 */
export declare function metricsMiddleware(req: Request, res: Response, next: NextFunction): void;
