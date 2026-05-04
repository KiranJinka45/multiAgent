"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const utils_1 = require("@packages/utils");
const utils_2 = require("@packages/utils");
const observability_1 = require("@packages/observability");
const db_1 = require("@packages/db");
if (!utils_2.QUEUE_STRATEGY)
    throw new Error("FATAL: QUEUE_STRATEGY name must be provided");
const strategyWorker = new utils_1.Worker(utils_2.QUEUE_STRATEGY, async (job) => {
    observability_1.logger.info('[StrategyWorker] Evaluating business performance...');
    // 1. Fetch latest metrics (hourly aggregation)
    const lastHour = new Date(Date.now() - 3600000);
    const events = await db_1.db.event.findMany({
        where: { createdAt: { gte: lastHour } }
    });
    const signups = events.filter(e => e.type === 'signup').length;
    const builds = events.filter(e => e.type === 'build_success').length;
    const conversions = events.filter(e => e.type === 'payment_success').length;
    // 2. Persist aggregated metrics (normalized for schema)
    const metrics = [
        { metric: 'signups', value: signups },
        { metric: 'conversions', value: conversions },
        { metric: 'builds', value: builds },
    ];
    for (const m of metrics) {
        await db_1.db.productMetric.create({
            data: {
                productId: 'global-strategy',
                metric: m.metric,
                value: m.value
            }
        });
    }
    // 3. Apply Decision Logic (Strategy Engine)
    if (conversions < 2 && signups > 10) {
        observability_1.logger.warn('[StrategyWorker] Low conversion detected. Triggering GrowthAgent.');
        await utils_2.queueManager.addJob('agent-task', {
            agent: 'growth-agent',
            goal: 'improve_conversion',
            context: { signups, conversions }
        });
    }
    if (builds > 50) {
        observability_1.logger.info('[StrategyWorker] High build volume. Notifying ScalingAgent.');
        await utils_2.queueManager.addJob('agent-task', {
            agent: 'scaling-agent',
            goal: 'optimize_infrastructure_costs'
        });
    }
    // 4. LEVEL-4 ADAPTATION: Strategy Evolution
    const agents = ['PlannerAgent', 'CoderAgent', 'CriticAgent'];
    for (const agentName of agents) {
        // Strategy model doesn't exist in Prisma schema? checking...
        // ... assuming we track this in metadata of other models for now ...
    }
}, { connection: utils_2.redis });
exports.default = strategyWorker;
//# sourceMappingURL=strategy-worker.js.map