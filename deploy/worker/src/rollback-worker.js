"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rollbackWorker = void 0;
// @ts-nocheck
const utils_1 = require("@packages/utils");
const utils_2 = require("@packages/utils");
const observability_1 = require("@packages/observability");
const db_1 = require("@packages/db");
if (!utils_2.QUEUE_ROLLBACK)
    throw new Error("FATAL: QUEUE_ROLLBACK name must be provided");
exports.rollbackWorker = new utils_1.Worker(utils_2.QUEUE_ROLLBACK, async (job) => {
    const { proposalId } = job.data;
    observability_1.logger.info({ proposalId }, '[RollbackWorker] Monitoring stability of promoted change');
    const proposal = await db_1.db.proposedChange.findUnique({ where: { id: proposalId } });
    if (!proposal || proposal.status !== 'promoted')
        return;
    // 1. Fetch metrics for the target agent/module after promotion
    const hourAgo = new Date(Date.now() - 3600000);
    const metrics = await db_1.db.executionLog.aggregate({
        _avg: { progress: true },
        where: {
            executionId: proposal.agentId,
            createdAt: { gte: hourAgo }
        }
    });
    // 2. Rollback Logic: If progress drops significantly
    const avgProgress = metrics?._avg?.progress ?? 100;
    const degradation = avgProgress < 60;
    if (degradation) {
        observability_1.logger.error({ proposalId, avgProgress }, '[RollbackWorker] DEGRADATION DETECTED. Executing Emergency Rollback.');
        await db_1.db.proposedChange.update({
            where: { id: proposalId },
            data: { status: 'rejected' }
        });
        observability_1.logger.warn(`Emergency Rollback triggered for ${proposal.targetPath}`);
    }
}, { connection: utils_2.redis });
exports.default = exports.rollbackWorker;
//# sourceMappingURL=rollback-worker.js.map