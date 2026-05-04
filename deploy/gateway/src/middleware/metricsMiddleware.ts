import { Request, Response, NextFunction } from 'express';
import { httpRequestDuration } from '@packages/observability';

/**
 * Metrics Middleware
 * Tracks latency, method, route, and status code using the shared observability library.
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const end = httpRequestDuration.startTimer();

  res.on('finish', () => {
    const route = req.route?.path || req.path || 'unknown';

    end({
      method: req.method,
      route,
      status_code: res.statusCode.toString(),
    });
  });

  next();
}