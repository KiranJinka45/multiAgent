"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsMiddleware = metricsMiddleware;
const observability_1 = require("@packages/observability");
/**
 * Metrics Middleware
 * Tracks latency, method, route, and status code using the shared observability library.
 */
function metricsMiddleware(req, res, next) {
    const end = observability_1.httpRequestDuration.startTimer();
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
//# sourceMappingURL=metricsMiddleware.js.map