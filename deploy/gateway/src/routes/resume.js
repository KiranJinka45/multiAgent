"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("@packages/db");
const utils_1 = require("@packages/utils");
const observability_1 = require("@packages/observability");
const core_engine_1 = require("@packages/core-engine");
const router = (0, express_1.Router)();
const resumeAgent = new utils_1.ResumeAgent();
router.post('/optimize', async (req, res) => {
    const { resumeText, targetRole, userId, tenantId } = req.body;
    const startTime = Date.now();
    try {
        // 1. Track Event: resume_submitted
        await db_1.db.event.create({
            data: {
                type: 'resume_submitted',
                userId: userId || 'anonymous',
                tenantId: tenantId || 'default',
                metadata: { targetRole }
            }
        });
        // 2. Invoke Agent
        const executionId = `resume-${Date.now()}`;
        const context = new core_engine_1.DistributedExecutionContext(executionId);
        await context.init(userId || 'anonymous', 'resume-optimization', targetRole, executionId);
        const result = await resumeAgent.execute({ resumeText, targetRole }, context);
        // 3. Track Event: optimization_completed
        await db_1.db.event.create({
            data: {
                type: 'optimization_completed',
                userId: userId || 'anonymous',
                tenantId: tenantId || 'default',
                metadata: {
                    score: result.data.score,
                    latency: Date.now() - startTime
                }
            }
        });
        res.json(result.data);
    }
    catch (error) {
        observability_1.logger.error({ error }, '[ResumeRoute] Optimization failed');
        res.status(500).json({ error: 'Failed to optimize resume' });
    }
});
exports.default = router;
//# sourceMappingURL=resume.js.map