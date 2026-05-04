"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventTracker = eventTracker;
const db_1 = require("@packages/db");
async function eventTracker(req, res, next) {
    const start = Date.now();
    res.on('finish', async () => {
        try {
            // Capture authenticated user if available
            const authReq = req;
            const userId = authReq.user?.id || null;
            const tenantId = authReq.user?.tenantId || null;
            await db_1.db.event.create({
                data: {
                    type: 'api_call',
                    userId,
                    tenantId,
                    metadata: {
                        path: req.path,
                        method: req.method,
                        status: res.statusCode,
                        duration: Date.now() - start,
                        ip: req.ip,
                        userAgent: req.get('user-agent'),
                    },
                },
            });
        }
        catch (error) {
            // Silent fail to avoid breaking requests if logging fails
            console.error('[EventTracker] Failed to log event:', error);
        }
    });
    next();
}
//# sourceMappingURL=event-tracker.js.map