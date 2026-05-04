"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.missionWorker = void 0;
// @ts-nocheck
const utils_1 = require("@packages/utils");
const utils_2 = require("@packages/utils");
const observability_1 = require("@packages/observability");
const core_engine_1 = require("@packages/core-engine");
const utils_3 = require("@packages/utils");
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const orchestrator = new core_engine_1.MissionOrchestrator();
if (!utils_2.QUEUE_FREE)
    throw new Error("FATAL: QUEUE_FREE name must be provided");
exports.missionWorker = new utils_1.Worker(utils_2.QUEUE_FREE, async (job) => {
    const { executionId, prompt, projectId } = job.data;
    const PROJECTS_ROOT = path_1.default.join(process.cwd(), '.generated-projects');
    const sandboxDir = path_1.default.join(PROJECTS_ROOT, projectId);
    // Register active job for signal handling
    global.activeMissionId = executionId;
    observability_1.logger.info({ executionId, projectId }, '[MissionWorker] Processing mission');
    try {
        // 1. Generate Code
        const result = await orchestrator.execute(executionId, prompt, projectId);
        if (!result.success)
            throw new Error(result.error || 'Mission execution failed');
        // 2. Persist to Disk (Required for Docker build/run)
        await fs_extra_1.default.ensureDir(sandboxDir);
        for (const file of result.files) {
            const filePath = path_1.default.join(sandboxDir, file.path);
            await fs_extra_1.default.ensureDir(path_1.default.dirname(filePath));
            await fs_extra_1.default.writeFile(filePath, file.content);
        }
        // 3. Deploy to Sandbox
        await utils_2.missionController.updateMission(executionId, { status: 'deploying' });
        await utils_2.eventBus.stage(executionId, 'deploying', 'in_progress', 'Allocating sandbox resources...', 85, projectId);
        const [port] = await utils_3.PortManager.acquirePorts(projectId, 1);
        const { containerId } = await utils_3.ContainerManager.start(projectId, port);
        const previewUrl = `/preview/${projectId}`;
        // 4. Finalize
        await utils_2.missionController.updateMission(executionId, {
            status: 'complete',
            metadata: { containerId, port, previewUrl }
        });
        await utils_2.eventBus.stage(executionId, 'previewing', 'completed', 'Sandbox is live!', 100, projectId);
        await utils_2.eventBus.complete(executionId, previewUrl, {
            taskCount: result.files.length,
            autonomousCycles: 1
        });
        observability_1.logger.info({ executionId, projectId, port }, '[MissionWorker] Sandbox deployed successfully');
    }
    catch (error) {
        observability_1.logger.error({ executionId, error }, '[MissionWorker] Critical failure');
        await utils_2.eventBus.error(executionId, error instanceof Error ? error.message : String(error), projectId);
        throw error;
    }
    finally {
        delete global.activeMissionId;
    }
}, {
    connection: utils_2.redis,
    concurrency: 5
});
// --- Graceful Shutdown Handler ---
const handleShutdown = async (signal) => {
    observability_1.logger.info({ signal }, '[MissionWorker] Received shutdown signal');
    const missionId = global.activeMissionId;
    if (missionId) {
        observability_1.logger.warn({ missionId }, '[MissionWorker] Interrupting active mission for shutdown');
        try {
            await utils_2.missionController.updateMission(missionId, {
                status: 'interrupted',
                metadata: { interruptReason: `Worker SIGKILL (${signal})` }
            });
            await utils_2.eventBus.error(missionId, `System restart: Mission interrupted by ${signal}. Re-enqueuing...`);
        }
        catch (err) {
            observability_1.logger.error({ err }, '[MissionWorker] Failed to mark mission as interrupted');
        }
    }
    await exports.missionWorker.close();
    process.exit(0);
};
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
//# sourceMappingURL=mission-worker.js.map