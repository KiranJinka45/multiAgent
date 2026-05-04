"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.koaCorrelationMiddleware = exports.correlationMiddleware = void 0;
const uuid_1 = require("uuid");
const context_1 = require("./context");
/**
 * REQUEST CORRELATION MIDDLEWARE
 * Ensures every request has a unique ID and propagates it through AsyncLocalStorage.
 */
const correlationMiddleware = (req, res, next) => {
    const requestId = req.headers['x-request-id'] || (0, uuid_1.v4)();
    const tenantId = req.headers['x-tenant-id'];
    const userId = req.headers['x-user-id'];
    // Set header for response
    res.setHeader('x-request-id', requestId);
    const context = {
        requestId,
        tenantId,
        userId,
    };
    context_1.contextStorage.run(context, () => {
        next();
    });
};
exports.correlationMiddleware = correlationMiddleware;
/**
 * Koa version of the correlation middleware
 */
const koaCorrelationMiddleware = async (ctx, next) => {
    const requestId = (ctx.get('x-request-id')) || (0, uuid_1.v4)();
    const tenantId = (ctx.get('x-tenant-id'));
    const userId = (ctx.get('x-user-id'));
    ctx.set('x-request-id', requestId);
    const context = {
        requestId,
        tenantId,
        userId,
    };
    return context_1.contextStorage.run(context, next);
};
exports.koaCorrelationMiddleware = koaCorrelationMiddleware;
//# sourceMappingURL=middleware.js.map