"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.plannerWorker = void 0;
// @ts-nocheck
const utils_1 = require("@packages/utils");
const utils_2 = require("@packages/utils");
const observability_1 = require("@packages/observability");
const utils_3 = require("@packages/utils");
const utils_4 = require("@packages/utils");
const agents_1 = require("@packages/agents");
const intentAgent = new agents_1.IntentDetectionAgent();
if (!utils_3.QUEUE_PLANNER)
    throw new Error("FATAL: QUEUE_PLANNER name must be provided");
exports.plannerWorker = new utils_1.Worker(utils_3.QUEUE_PLANNER, async (job) => {
    const { projectId, executionId, userId, prompt, strategy } = job.data;
    observability_1.logger.info({ projectId, executionId }, '[Planner Worker] Started');
    try {
        await utils_3.eventBus.stage(executionId, 'initializing', 'in_progress', 'Planner Agent: Analyzing user intent...', 20);
        // 1. Intent Detection (Detailed Planning)
        const intentResult = await intentAgent.execute({
            prompt,
            context: { techStack: strategy?.recommendedTechStack }
        }, { executionId, userId, projectId });
        if (!intentResult.success) {
            throw new Error(`Planner: Failed to detect intent. ${intentResult.error || ''}`);
        }
        const intent = intentResult.data;
        observability_1.logger.info({ projectId, template: intent.templateId }, '[Planner Worker] Intent detected');
        // 2. Update Context state
        const context = new utils_4.DistributedExecutionContext(executionId);
        await context.atomicUpdate(ctx => {
            ctx.metadata.intent = intent;
            ctx.metadata.strategy = strategy || ctx.metadata.strategy;
            ctx.status = 'executing';
        });
        await utils_3.eventBus.stage(executionId, 'PlannerAgent', 'in_progress', `Selected template: ${intent.templateId}`, 30);
        // 3. Hand off to Architecture stage
        await utils_4.architectureQueue.add('design-architecture', {
            projectId,
            executionId,
            userId,
            prompt,
            intent,
            strategy
        });
        await utils_3.eventBus.stage(executionId, 'initializing', 'completed', 'Planning complete. Architecture design started.', 30);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        observability_1.logger.error({ error, executionId }, '[Planner Worker] Failed');
        await utils_3.eventBus.error(executionId, `Planner Error: ${errorMessage}`);
        throw error;
    }
}, {
    connection: utils_2.redis,
    concurrency: 5
});
observability_1.logger.info('Planner Worker online');
//# sourceMappingURL=planner-worker.js.map