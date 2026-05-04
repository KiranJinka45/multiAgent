"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evolutionWorker = void 0;
// @ts-nocheck
const utils_1 = require("@packages/utils");
const observability_1 = require("@packages/observability");
const utils_2 = require("@packages/utils");
const self_evolution_1 = require("@packages/self-evolution");
const utils_3 = require("@packages/utils");
if (!utils_3.QUEUE_EVOLUTION)
    throw new Error("FATAL: QUEUE_EVOLUTION name must be provided");
const evolver = new self_evolution_1.SelfEvolver({ autoRefactor: true });
exports.evolutionWorker = new utils_1.Worker(utils_3.QUEUE_EVOLUTION, async (job) => {
    observability_1.logger.info({ jobId: job.id }, '[Evolution Worker] Starting system evolution cycle');
    try {
        // In a real system, we would fetch actual metrics from Prometheus/DB
        const mockMetrics = {
            cpuUsage: 80,
            memoryUsage: 90,
            errorRate: 5,
            latencyTarget: 200,
            actualLatency: 350
        };
        const mockLogs = [
            "WARN: High latency detected in API Gateway",
            "ERROR: Connection timeout to Redis"
        ];
        const result = await evolver.evolve(mockMetrics, mockLogs);
        observability_1.logger.info({ result }, '[Evolution Worker] Evolution cycle completed');
        return result;
    }
    catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        observability_1.logger.error({ err }, '[Evolution Worker] Evolution cycle failed');
        throw new Error(`Evolution Error: ${errorMessage}`);
    }
}, {
    connection: utils_2.redis,
    concurrency: 1
});
observability_1.logger.info('Self-Evolution Worker online');
//# sourceMappingURL=evolution-worker.js.map