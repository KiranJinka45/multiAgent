"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoRefactorWorker = void 0;
// @ts-nocheck
const utils_1 = require("@packages/utils");
const observability_1 = require("@packages/observability");
const utils_2 = require("@packages/utils");
const refactor_agent_1 = require("@packages/refactor-agent"); // Using exported member
if (!utils_2.QUEUE_REFACTOR)
    throw new Error("FATAL: QUEUE_REFACTOR name must be provided");
exports.autoRefactorWorker = new utils_1.Worker(utils_2.QUEUE_REFACTOR, async (job) => {
    const { targetPath } = job.data;
    observability_1.logger.info({ jobId: job.id, targetPath }, '[Auto-Refactor Worker] Starting refactoring process');
    try {
        if (!targetPath) {
            throw new Error('targetPath is required for auto-refactor');
        }
        const fixed = await (0, refactor_agent_1.applyFixes)(targetPath);
        observability_1.logger.info({ fixed, targetPath }, '[Auto-Refactor Worker] Refactoring completed');
        return fixed;
    }
    catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        observability_1.logger.error({ err, targetPath }, '[Auto-Refactor Worker] Refactoring failed');
        throw new Error(`Refactor Error: ${errorMessage}`);
    }
}, {
    connection: utils_2.redis,
    concurrency: 2
});
observability_1.logger.info('Auto-Refactor Worker online');
//# sourceMappingURL=auto-refactor-worker.js.map