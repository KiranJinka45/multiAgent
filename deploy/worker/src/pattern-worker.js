"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.patternWorker = void 0;
// @ts-nocheck
const utils_1 = require("@packages/utils");
const utils_2 = require("@packages/utils");
const observability_1 = require("@packages/observability");
const db_1 = require("@packages/db");
if (!utils_2.QUEUE_PATTERN)
    throw new Error("FATAL: QUEUE_PATTERN name must be provided");
exports.patternWorker = new utils_1.Worker(utils_2.QUEUE_PATTERN, async (job) => {
    observability_1.logger.info('[PatternWorker] Searching for behavioral patterns...');
    // Pattern discovery uses aggregate queries against execution logs.
    // Cast to `any` because the schema fields (taskType, score, latency)
    // may be stored in the `metadata` JSON column rather than as top-level fields.
    const results = await db_1.db.executionLog.groupBy({
        by: ['stage', 'status'],
        _count: { _all: true },
        where: { createdAt: { gte: new Date(Date.now() - 86400000) } }
    });
    for (const res of results) {
        const { stage, status, _count } = res;
        if (status === 'failed' && _count._all > 5) {
            await db_1.db.pattern.create({
                data: {
                    name: `failure_pattern_${stage}`,
                    description: `High failure rate detected for ${stage}`,
                    metadata: { count: _count._all }
                }
            });
        }
        if (status === 'completed' && _count._all > 10) {
            await db_1.db.pattern.create({
                data: {
                    name: `success_pattern_${stage}`,
                    description: `High performance pattern for ${stage}`,
                    metadata: { count: _count._all }
                }
            });
        }
    }
    observability_1.logger.info('[PatternWorker] Pattern discovery complete');
}, { connection: utils_2.redis });
exports.default = exports.patternWorker;
//# sourceMappingURL=pattern-worker.js.map