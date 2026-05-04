"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.repairWorker = void 0;
// @ts-nocheck
const utils_1 = require("@packages/utils");
const observability_1 = require("@packages/observability");
const utils_2 = require("@packages/utils");
const utils_3 = require("@packages/utils");
const agents_1 = require("@packages/agents");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const logPath = path_1.default.join(process.cwd(), 'repair_direct.log');
const log = (msg) => fs_1.default.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);
log('Repair Worker script started');
const repairAgent = new agents_1.RepairAgent();
exports.repairWorker = new utils_1.Worker(utils_2.QUEUE_REPAIR, async (job) => {
    const { executionId, projectId, prompt } = job.data;
    log(`[Repair] Job received for ${executionId}`);
    const sandboxDir = path_1.default.join(process.cwd(), '.generated-projects', projectId);
    observability_1.logger.info({ executionId, projectId }, '[Repair Worker] Starting autonomous repair');
    try {
        const context = new utils_3.DistributedExecutionContext(executionId);
        const data = await context.get();
        if (!data)
            return;
        // --- REPAIR LIMIT GUARD (Fix 5) ---
        const repairAttempts = await utils_2.redis.hincrby(`mission:stats:${executionId}`, 'repair_attempts', 1);
        if (repairAttempts > 3) {
            log(`[Repair] Limit exceeded (${repairAttempts}). Failing mission.`);
            await utils_2.eventBus.error(executionId, 'Build failed autonomously after 3 repair attempts. Manual intervention required.');
            return;
        }
        // ----------------------------------
        await utils_2.eventBus.stage(executionId, 'testing', 'in_progress', `Supervisor: Engaging Repair Agent to fix build errors (Attempt ${repairAttempts}/3)...`, 80);
        // 1. Get failed agent information
        const agentResults = data.agentResults || {};
        const failedAgent = Object.values(agentResults).find((r) => r.status === 'failed');
        const error = failedAgent?.error || 'Unknown error';
        // 2. Prepare files for RepairAgent
        const allFiles = data.finalFiles || [];
        // 3. Invoke RepairAgent
        const repairResult = await repairAgent.execute({
            error,
            stdout: '',
            files: allFiles.slice(0, 20)
        }, {});
        if (repairResult.success && repairResult.data.patches?.length > 0) {
            const vfs = new utils_3.VirtualFileSystem();
            vfs.loadFromDiskState(allFiles);
            for (const patch of repairResult.data.patches) {
                vfs.setFile(patch.path, patch.content);
            }
            // 4. Commit fixes
            await utils_3.CommitManager.commit(vfs, sandboxDir);
            // 5. Update context
            await context.atomicUpdate((ctx) => {
                ctx.finalFiles = vfs.getAllFiles();
                if (failedAgent && ctx.agentResults && ctx.agentResults[failedAgent.agentName]) {
                    ctx.agentResults[failedAgent.agentName].status = 'pending';
                }
            });
            log(`[Repair] Success! Applied ${repairResult.data.patches.length} patches.`);
            // 6. Re-enqueue the validator stage
            log(`[Repair] Re-enqueuing validator...`);
            await utils_3.validatorQueue.add('verify-repaired-build', {
                projectId,
                executionId,
                prompt
            });
        }
        else {
            log(`[Repair] Failed to generate patches.`);
            throw new Error('RepairAgent could not generate valid patches.');
        }
    }
    catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        log(`[Repair] CRITICAL ERROR: ${errorMessage}`);
        observability_1.logger.error({ err, executionId }, '[Repair Worker] Repair failed');
        await utils_2.eventBus.error(executionId, `Repair failed: ${errorMessage}`);
        throw err;
    }
}, {
    connection: utils_2.redis,
    concurrency: 2
});
observability_1.logger.info('Repair Worker online');
process.on('SIGINT', () => { console.log("RECEIVED SIGINT"); process.exit(0); });
process.on('SIGTERM', () => { console.log("RECEIVED SIGTERM"); process.exit(0); });
setInterval(() => {
    log("Heartbeat...");
}, 30000);
new Promise(() => { });
//# sourceMappingURL=repair-worker.js.map