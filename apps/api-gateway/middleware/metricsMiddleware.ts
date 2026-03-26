import { Request, Response, NextFunction } from "express";
import { httpRequestDuration } from "@libs/observability";

/**
 * Middleware to track HTTP request duration and status.
 * Supports Express-based services.
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const end = httpRequestDuration.startTimer();

  res.on("finish", () => {
    end({
      method: req.method,
      route: req.route?.path || req.path,
      status: res.statusCode,
    });
  });

  next();
}
