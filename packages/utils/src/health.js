"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHealthRouter = createHealthRouter;
const express_1 = require("express");
const db_1 = require("@packages/db");
const observability_1 = require("@packages/observability");
/**
 * Standardized Health Check Router
 * Provides both minimal (/health) and detailed (/health/details) endpoints.
 */
function createHealthRouter(options) {
    const router = (0, express_1.Router)();
    // 1. Liveness Probe (Minimal) - Used by Kubernetes
    router.get('/health', (_req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    // 2. Readiness Probe - Used by Kubernetes
    router.get('/health/ready', async (_req, res) => {
        try {
            await db_1.db.$queryRaw `SELECT 1`;
            res.json({ status: 'ready', timestamp: new Date().toISOString() });
        }
        catch (err) {
            observability_1.logger.error({ err }, `[Health][${options.serviceName}] Readiness check failed`);
            res.status(503).json({ status: 'unready', error: 'Database unavailable' });
        }
    });
    // 3. Detailed Health - Used for monitoring
    router.get('/health/details', async (_req, res) => {
        let dbStatus = 'up';
        try {
            await db_1.db.$queryRaw `SELECT 1`;
        }
        catch (err) {
            dbStatus = 'down';
            observability_1.logger.error({ err }, `[Health][${options.serviceName}] DB check failed`);
        }
        const dependencies = options.checkDependencies
            ? await options.checkDependencies().catch(err => {
                observability_1.logger.error({ err }, `[Health][${options.serviceName}] Custom dependency check failed`);
                return { error: { status: 'down', message: String(err) } };
            })
            : {};
        const isHealthy = dbStatus === 'up' && Object.values(dependencies).every(d => d.status === 'up');
        res.status(isHealthy ? 200 : 503).json({
            status: isHealthy ? 'healthy' : 'degraded',
            service: options.serviceName,
            timestamp: new Date().toISOString(),
            checks: {
                database: { status: dbStatus },
                ...dependencies
            }
        });
    });
    return router;
}
// Removed local CircuitBreaker class as it is now imported from @packages/events
//# sourceMappingURL=health.js.map