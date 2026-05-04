"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackEvent = void 0;
const db_1 = require("@packages/db");
const trackEvent = async (req, res) => {
    const { type, metadata } = req.body;
    const authReq = req;
    const userId = authReq.user?.id || null;
    const tenantId = authReq.user?.tenantId || null;
    try {
        await db_1.db.event.create({
            data: {
                type,
                metadata: metadata || {},
                userId,
                tenantId,
            },
        });
        res.json({ success: true });
    }
    catch (error) {
        const err = error instanceof Error ? error.message : String(error);
        res.status(500).json({ error: 'Failed to track event', details: err });
    }
};
exports.trackEvent = trackEvent;
//# sourceMappingURL=events.js.map