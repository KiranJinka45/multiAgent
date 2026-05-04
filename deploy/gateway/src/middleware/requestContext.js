"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestContext = requestContext;
const uuid_1 = require("uuid");
/**
 * Request Context Middleware
 * Generates and attaches a unique x-request-id to each incoming request.
 */
function requestContext(req, res, next) {
    const requestId = req.headers['x-request-id'] || (0, uuid_1.v4)();
    // Attach to headers for downstream systems
    req.headers['x-request-id'] = requestId;
    // Attach to request object for internal logging
    req.requestId = requestId;
    // Add to response headers for debugging
    res.setHeader('X-Request-Id', requestId);
    next();
}
//# sourceMappingURL=requestContext.js.map