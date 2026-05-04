"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supervisorWorker = void 0;
// @ts-nocheck
const utils_1 = require("@packages/utils");
const observability_1 = require("@packages/observability");
const utils_2 = require("@packages/utils");
const watchdog_1 = require("@packages/runtime/watchdog");
if (!utils_2.QUEUE_SUPERVISOR)
    throw new Error("FATAL: QUEUE_SUPERVISOR name must be provided");
watchdog_1.PreviewWatchdog.start();
exports.supervisorWorker = new utils_1.Worker(utils_2.QUEUE_SUPERVISOR, async (job) => {
    if (job.name === 'health-check-loop') {
        const activeIds = await utils_2.DistributedExecutionContext.getActiveExecutions();
        observability_1.logger.info({ count: activeIds.length }, '[Supervisor Worker] Running global health check');
        for (const id of activeIds) {
            try {
                const decision = await utils_2.supervisorService.checkHealth(id);
                if (decision !== 'NONE') {
                    await utils_2.supervisorService.handleDecision(id, decision);
                }
            }
            catch (err) {
                observability_1.logger.error({ id, err }, '[Supervisor Worker] Error checking execution health');
            }
        }
    }
}, {
    connection: utils_2.redis,
    concurrency: 1
});
// Setup repeatable job if it doesn't exist
async function setupCron() {
    if (!utils_2.supervisorQueue) {
        observability_1.logger.warn('[Supervisor Worker] supervisorQueue not initialized, skipping cron setup');
        return;
    }
    const repeatableJobs = await utils_2.supervisorQueue.getRepeatableJobs();
    if (!repeatableJobs.find(j => j.name === 'health-check-loop')) {
        await utils_2.supervisorQueue.add('health-check-loop', {}, {
            repeat: {
                every: 30000 // 30 seconds
            }
        });
        observability_1.logger.info('[Supervisor Worker] Repeatable health-check-loop job scheduled.');
    }
}
setupCron().catch(err => observability_1.logger.error({ err }, 'Failed to setup supervisor cron'));
observability_1.logger.info('Supervisor Worker online');
//# sourceMappingURL=supervisor-worker.js.map