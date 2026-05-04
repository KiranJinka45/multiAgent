"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildWorker = void 0;
const utils_1 = require("@packages/utils");
const core_engine_1 = require("@packages/core-engine");
const queue_1 = require("@packages/queue");
const observability_1 = require("@packages/observability");
exports.buildWorker = new utils_1.Worker('build', async (job) => {
    const { missionId, prompt, isUpdate, isDeploy, vpsIp } = job.data;
    observability_1.logger.info({ missionId, jobId: job.id, isUpdate, isDeploy }, '[Worker] Job received');
    try {
        if (isDeploy) {
            const result = await (0, core_engine_1.deployPipeline)(missionId, vpsIp || '1.1.1.1');
            return result;
        }
        else if (isUpdate) {
            await (0, core_engine_1.updatePipeline)(missionId, prompt);
            return { success: true, missionId };
        }
        else {
            const result = await (0, core_engine_1.runPipeline)(missionId, prompt);
            return result;
        }
    }
    catch (error) {
        observability_1.logger.error({ missionId, error: error.message }, '[Worker] Pipeline execution crashed');
        throw error;
    }
}, {
    connection: queue_1.connection,
    concurrency: 5
});
observability_1.logger.info('[Worker] Build worker online');
//# sourceMappingURL=buildWorker.js.map