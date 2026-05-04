"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatorWorker = void 0;
const utils_1 = require("@packages/utils");
const utils_2 = require("@packages/utils");
const observability_1 = require("@packages/observability");
const utils_3 = require("@packages/utils");
const utils_4 = require("@packages/utils");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const logPath = path_1.default.join(process.cwd(), 'validator_direct.log');
const log = (msg) => fs_1.default.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);
if (!utils_3.QUEUE_VALIDATE)
    throw new Error("FATAL: QUEUE_VALIDATE name must be provided");
exports.validatorWorker = new utils_1.Worker(utils_3.QUEUE_VALIDATE, async (job) => {
    const { projectId, executionId, prompt, strategy } = job.data;
    log(`[Validator] Job received for ${executionId}`);
    const sandboxDir = path_1.default.join(process.cwd(), '.generated-projects', projectId);
    observability_1.logger.info({ projectId, executionId }, '[Validator Worker] Started Verification');
    try {
        await utils_3.eventBus.stage(executionId, 'testing', 'in_progress', 'Validator Agent: Running type checks...', 75);
        const context = new utils_4.DistributedExecutionContext(executionId);
        const data = await context.get();
        const allFiles = data?.finalFiles || [];
        const vfs = new utils_4.VirtualFileSystem();
        vfs.loadFromDiskState(allFiles);
        log(`[Validator] Running verifier on ${sandboxDir}`);
        const verification = await utils_4.patchVerifier.verify(sandboxDir, vfs);
        if (verification.passed) {
            log(`[Validator] PASSED`);
            await utils_3.eventBus.stage(executionId, 'ValidatorAgent', 'completed', 'Build verification passed ✅', 100);
            // Hand off to Docker stage
            await utils_4.dockerQueue.add('build-container', {
                projectId,
                executionId,
                prompt,
                strategy
            });
            await utils_3.eventBus.stage(executionId, 'testing', 'completed', 'Verification complete.', 85);
        }
        else {
            log(`[Validator] FAILED with ${verification.errors?.length} errors: ${verification.errors?.join(' | ')}`);
            log(`Triggering Repair.`);
            // Set failure context so RepairAgent knows the error
            await context.atomicUpdate((ctx) => {
                ctx.status = 'executing';
                if (!ctx.agentResults)
                    ctx.agentResults = {};
                ctx.agentResults['ValidatorAgent'] = {
                    agentName: 'ValidatorAgent',
                    status: 'failed',
                    error: verification.errors?.join('\n') || 'TypeScript verification failed',
                    attempts: 1,
                    startTime: new Date().toISOString()
                };
            });
            await utils_3.eventBus.stage(executionId, 'testing', 'in_progress', `Validator Agent: Build failed. Routing to Repair Agent...`, 80);
            await utils_4.repairQueue.add('repair-build', {
                projectId,
                executionId,
                prompt
            });
        }
        const mem = process.memoryUsage();
        const memMb = Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100;
        log(`[Validator] Memory usage: ${memMb} MB (Heap Used)`);
        observability_1.logger.info({ executionId, memoryMb: memMb }, '[Validator Worker] Memory Usage');
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log(`[Validator] ERROR: ${errorMessage}`);
        observability_1.logger.error({ error, executionId }, '[Validator Worker] Failed');
        await utils_3.eventBus.error(executionId, `Validator Error: ${errorMessage}`);
        throw error;
    }
}, {
    connection: utils_2.redis,
    concurrency: 5
});
observability_1.logger.info('Validator Worker online');
//# sourceMappingURL=validator-worker.js.map