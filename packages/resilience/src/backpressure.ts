import { Request, Response, NextFunction } from 'express';
import { logger } from '@packages/observability';
import os from 'os';

interface BackpressureOptions {
    baseConcurrentRequests: number;
    stressedConcurrentRequests: number;
    cpuThreshold: number;
    memThreshold: number;
}

const defaultOptions: BackpressureOptions = {
    baseConcurrentRequests: 50,
    stressedConcurrentRequests: 20,
    cpuThreshold: 1.5, // 1-minute load average
    memThreshold: 0.8, // 80% heap usage
};

/**
 * Adaptive Backpressure Middleware
 * Sensitively adjusts the concurrency limit based on real-time system health (CPU/MEM).
 */
export function createBackpressureMiddleware(options = defaultOptions) {
    let activeRequests = 0;

    return (req: Request, res: Response, next: NextFunction) => {
        const cpuLoad = os.loadavg()[0];
        const memUsage = process.memoryUsage().heapUsed / process.memoryUsage().heapTotal;
        
        // Determine dynamic limit based on system stress
        const currentLimit = (cpuLoad > options.cpuThreshold || memUsage > options.memThreshold)
            ? options.stressedConcurrentRequests
            : options.baseConcurrentRequests;

        if (activeRequests >= currentLimit) {
            logger.warn(
                { activeRequests, limit: currentLimit, cpuLoad, memUsage },
                '[Resilience] Adaptive Backpressure Triggered: Request Rejected'
            );
            return res.status(503).json({
                error: 'Service temporarily overloaded (Adaptive)',
                activeRequests,
                limit: currentLimit,
                code: 'SERVICE_OVERLOADED'
            });
        }

        activeRequests++;

        res.on('finish', () => {
            activeRequests--;
        });

        res.on('close', () => {
            if (!res.writableEnded) {
                activeRequests--;
            }
        });

        next();
    };
}
