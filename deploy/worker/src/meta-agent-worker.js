"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metaWorker = void 0;
// @ts-nocheck
const utils_1 = require("@packages/utils");
const observability_1 = require("@packages/observability");
const utils_2 = require("@packages/utils");
const utils_3 = require("@packages/utils");
const agents_1 = require("@packages/agents");
if (!utils_3.QUEUE_META)
    throw new Error("FATAL: QUEUE_META name must be provided");
const metaAgent = new agents_1.MetaAgent();
exports.metaWorker = new utils_1.Worker(utils_3.QUEUE_META, async (job) => {
    const { executionId, prompt, userId, projectId } = job.data;
    observability_1.logger.info({ executionId, projectId }, '[Meta Worker] Analyzing project intent');
    try {
        // 1. Initial UI update
        await utils_3.eventBus.stage(executionId, 'meta-analysis', 'in_progress', 'Analyzing project requirements...', 10);
        // 2. Perform high-level analysis
        const result = await metaAgent.execute({ prompt }, { executionId, userId, projectId });
        if (!result.success) {
            throw new Error(result.error || 'MetaAgent analysis failed');
        }
        const strategy = result.data;
        observability_1.logger.info({ projectId, executionId }, '[Meta Worker] Analysis complete');
        await utils_3.eventBus.stage(executionId, 'meta-analysis', 'completed', 'Analysis complete. Recommended stack identified.', 15);
        // 3. Hand off to Planner stage
        await utils_2.plannerQueue.add('plan-project', {
            projectId,
            executionId,
            userId,
            prompt,
            strategy
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        observability_1.logger.error({ error, executionId }, '[Meta Worker] Failed');
        await utils_3.eventBus.error(executionId, `Meta-Agent Error: ${errorMessage}`);
        throw error;
    }
}, {
    connection: utils_2.redis,
    concurrency: 5
});
observability_1.logger.info('Meta Worker online');
//# sourceMappingURL=meta-agent-worker.js.map