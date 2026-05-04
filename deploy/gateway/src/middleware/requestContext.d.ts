import { Request, Response, NextFunction } from 'express';
/**
 * Request Context Middleware
 * Generates and attaches a unique x-request-id to each incoming request.
 */
export declare function requestContext(req: Request, res: Response, next: NextFunction): void;
