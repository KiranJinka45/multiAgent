"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatorWorker = void 0;
// @ts-nocheck
const utils_1 = require("@packages/utils");
const utils_2 = require("@packages/utils");
const observability_1 = require("@packages/observability");
const utils_3 = require("@packages/utils");
const utils_4 = require("@packages/utils");
const agents_1 = require("@packages/agents");
const generatorAgent = new agents_1.GeneratorAgent();
const blueprintManager = new utils_4.BlueprintManager();
if (!utils_3.QUEUE_GENERATOR)
    throw new Error("FATAL: QUEUE_GENERATOR name must be provided");
exports.generatorWorker = new utils_1.Worker(utils_3.QUEUE_GENERATOR, async (job) => {
    const { projectId, executionId, userId, prompt, intent, strategy } = job.data;
    observability_1.logger.info({ projectId, executionId }, '[Generator Worker] Generating codebase');
    try {
        await utils_3.eventBus.stage(executionId, 'generating', 'in_progress', 'Generator Agent: Creating file blueprints...', 45);
        // 1. Load Blueprints
        const blueprints = await blueprintManager.getForTemplate(intent.templateId);
        // 2. Generate Code
        const result = await generatorAgent.execute({
            prompt,
            blueprints,
            techStack: strategy?.recommendedTechStack
        }, { executionId, userId, projectId });
        if (!result.success) {
            throw new Error(`Generator: Failed to generate files. ${result.error || ''}`);
        }
        const files = result.data.files;
        const vfs = new utils_4.VirtualFileSystem();
        vfs.loadFromDiskState(files);
        // 3. Update Context
        const context = new utils_4.DistributedExecutionContext(executionId);
        await context.atomicUpdate(ctx => {
            ctx.finalFiles = files;
            ctx.status = 'executing';
        });
        await utils_3.eventBus.stage(executionId, 'generating', 'completed', `Generated ${files.length} files. Starting verification...`, 70);
        // 4. Hand off to Validator stage
        await utils_4.validatorQueue.add('validate-build', {
            projectId,
            executionId,
            userId,
            prompt,
            strategy
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        observability_1.logger.error({ error, executionId }, '[Generator Worker] Failed');
        await utils_3.eventBus.error(executionId, `Generator Error: ${errorMessage}`);
        throw error;
    }
}, {
    connection: utils_2.redis,
    concurrency: 3
});
observability_1.logger.info('Generator Worker online');
//# sourceMappingURL=generator-worker.js.map