import { v4 as uuid } from "uuid";
import { Request, Response, NextFunction } from "express";

/**
 * Middleware to attach a unique request ID to each incoming request.
 * Supports Express-based services within the API Gateway.
 */
export function requestContext(req: Request, res: Response, next: NextFunction) {
  const requestId = uuid();

  req.headers["x-request-id"] = requestId;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (req as any).requestId = requestId;

  next();
}
