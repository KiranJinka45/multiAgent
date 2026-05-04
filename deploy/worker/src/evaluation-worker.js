"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluationWorker = void 0;
// @ts-nocheck
const utils_1 = require("@packages/utils");
const utils_2 = require("@packages/utils");
const observability_1 = require("@packages/observability");
const db_1 = require("@packages/db");
if (!utils_2.QUEUE_EVALUATION)
    throw new Error("FATAL: QUEUE_EVALUATION name must be provided");
exports.evaluationWorker = new utils_1.Worker(utils_2.QUEUE_EVALUATION, async (job) => {
    observability_1.logger.info({ jobId: job.id }, '[EvaluationWorker] Starting execution log analysis');
    const lastHour = new Date(Date.now() - 3600000);
    // Fetch recent logs for evaluation
    const logs = await db_1.db.executionLog.findMany({
        where: {
            createdAt: { gte: lastHour }
        }
    });
    observability_1.logger.info({ count: logs.length }, '[EvaluationWorker] Scoring recent logs');
    for (const log of logs) {
        let score = 0;
        const meta = log.metadata || {};
        // Heuristic scoring based on metadata
        if (log.status === 'completed')
            score += 50;
        // Reward lower latency
        const latency = meta.latency ?? meta.durationMs ?? 5000;
        if (latency < 2000)
            score += 20;
        else if (latency < 5000)
            score += 10;
        // Reward cost efficiency
        const cost = meta.cost ?? 0;
        if (cost > 0 && cost < 0.005)
            score += 30;
        else if (cost < 0.01)
            score += 15;
        // Store score in metadata since ExecutionLog doesn't have a score column
        await db_1.db.executionLog.update({
            where: { id: log.id },
            data: { metadata: { ...meta, score } }
        });
    }
    observability_1.logger.info('[EvaluationWorker] Evaluation batch complete');
}, { connection: utils_2.redis });
exports.default = exports.evaluationWorker;
//# sourceMappingURL=evaluation-worker.js.map