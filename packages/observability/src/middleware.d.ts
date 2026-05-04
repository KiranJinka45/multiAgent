import { Request, Response, NextFunction } from 'express';
/**
 * REQUEST CORRELATION MIDDLEWARE
 * Ensures every request has a unique ID and propagates it through AsyncLocalStorage.
 */
export declare const correlationMiddleware: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Koa version of the correlation middleware
 */
export declare const koaCorrelationMiddleware: (ctx: any, next: () => Promise<void>) => Promise<void>;
//# sourceMappingURL=middleware.d.ts.map