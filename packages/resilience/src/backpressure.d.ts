import type { Request, Response, NextFunction } from 'express';
interface BackpressureOptions {
    baseConcurrentRequests: number;
    stressedConcurrentRequests: number;
    cpuThreshold: number;
    memThreshold: number;
}
/**
 * Adaptive Backpressure Middleware
 * Sensitively adjusts the concurrency limit based on real-time system health (CPU/MEM).
 */
export declare function createBackpressureMiddleware(options?: BackpressureOptions): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export {};
//# sourceMappingURL=backpressure.d.ts.map