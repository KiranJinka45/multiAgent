"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dockerWorker = void 0;
// @ts-nocheck
const utils_1 = require("@packages/utils");
const utils_2 = require("@packages/utils");
const observability_1 = require("@packages/observability");
const utils_3 = require("@packages/utils");
const utils_4 = require("@packages/utils");
const podController = new utils_4.SandboxPodController();
if (!utils_3.QUEUE_DOCKER)
    throw new Error("FATAL: QUEUE_DOCKER name must be provided");
exports.dockerWorker = new utils_1.Worker(utils_3.QUEUE_DOCKER, async (job) => {
    const { projectId, executionId } = job.data;
    observability_1.logger.info({ projectId, executionId }, '[Docker Worker] Starting deployment');
    try {
        await utils_3.eventBus.stage(executionId, 'deployment', 'in_progress', 'Docker Agent: Creating sandbox environment...', 90);
        const context = new utils_4.DistributedExecutionContext(executionId);
        const data = await context.get();
        // 1. Deploy to Sandbox
        const deployment = await podController.deploy(projectId, executionId, data?.finalFiles || []);
        if (!deployment.success) {
            throw new Error(`Docker: Sandbox deployment failed. ${deployment.error || ''}`);
        }
        // 2. Update Context with preview URL
        await context.atomicUpdate(ctx => {
            ctx.metadata.previewUrl = deployment.url;
            ctx.status = 'completed';
        });
        await utils_3.eventBus.complete(executionId, deployment.url, {
            tokensTotal: data?.metadata?.tokensTotal,
            durationMs: data?.metadata?.durationMs
        }, projectId, data?.finalFiles);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        observability_1.logger.error({ error, executionId }, '[Docker Worker] Failed');
        await utils_3.eventBus.error(executionId, `Docker Error: ${errorMessage}`);
        throw error;
    }
}, {
    connection: utils_2.redis,
    concurrency: 2
});
observability_1.logger.info('Docker Worker online');
//# sourceMappingURL=docker-worker.js.map