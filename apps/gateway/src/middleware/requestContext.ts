import { v4 as uuid } from 'uuid';
import { Request, Response, NextFunction } from 'express';

/**
 * Request Context Middleware
 * Generates and attaches a unique x-request-id to each incoming request.
 */
export function requestContext(req: Request, res: Response, next: NextFunction) {
  const requestId = uuid();

  // Attach to headers for downstream systems
  req.headers['x-request-id'] = requestId;
  
  // Attach to request object for internal logging
  (req as Request & { requestId: string }).requestId = requestId;

  // Add to response headers for debugging
  res.setHeader('X-Request-Id', requestId);

  next();
}
