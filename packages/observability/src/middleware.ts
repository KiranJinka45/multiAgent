import { Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';
import { contextStorage, RequestContext } from './context';

/**
 * REQUEST CORRELATION MIDDLEWARE
 * Ensures every request has a unique ID and propagates it through AsyncLocalStorage.
 */
export const correlationMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const requestId = (req.headers['x-request-id'] as string) || uuid();
    const tenantId = (req.headers['x-tenant-id'] as string);
    const userId = (req.headers['x-user-id'] as string);

    // Set header for response
    res.setHeader('x-request-id', requestId);

    const context: RequestContext = {
        requestId,
        tenantId,
        userId,
    };

    contextStorage.run(context, () => {
        next();
    });
};

/**
 * Koa version of the correlation middleware
 */
export const koaCorrelationMiddleware = async (ctx: any, next: () => Promise<void>) => {
    const requestId = (ctx.get('x-request-id')) || uuid();
    const tenantId = (ctx.get('x-tenant-id'));
    const userId = (ctx.get('x-user-id'));

    ctx.set('x-request-id', requestId);

    const context: RequestContext = {
        requestId,
        tenantId,
        userId,
    };

    return contextStorage.run(context, next);
};
