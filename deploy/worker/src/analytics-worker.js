"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const utils_1 = require("@packages/utils");
const utils_2 = require("@packages/utils");
const observability_1 = require("@packages/observability");
const db_1 = require("@packages/db");
if (!utils_2.ANALYTICS_QUEUE)
    throw new Error("FATAL: ANALYTICS_QUEUE name must be provided");
const analyticsWorker = new utils_1.Worker(utils_2.ANALYTICS_QUEUE, async (job) => {
    const { type, userId, tenantId, metadata } = job.data;
    observability_1.logger.info({ type, userId }, '[AnalyticsWorker] Processing event');
    switch (type) {
        case 'conversion':
            // Calculate Trial-to-Paid Conversion rate for the product
            const { productId } = metadata;
            const totalVisits = await db_1.db.event.count({
                where: {
                    type: 'resume_submitted',
                    data: { path: productId }
                }
            });
            const totalPaid = await db_1.db.subscription.count({
                where: { productId, status: 'active' }
            });
            await db_1.db.productMetric.create({
                data: {
                    productId,
                    date: new Date(),
                    revenue: totalPaid * 19, // Hardcoded for MVP
                    users: totalVisits,
                    conversions: totalPaid,
                    metadata: { conversionRate: (totalPaid / totalVisits) * 100 }
                }
            });
            break;
        case 'churn':
            // Log churn event for autonomous strategy engine to analyze patterns
            observability_1.logger.warn({ userId, tenantId }, '[AnalyticsWorker] Churn detected. Triggering retention strategy.');
            break;
        default:
            break;
    }
}, { connection: utils_2.redis });
analyticsWorker.on('failed', (job, err) => {
    observability_1.logger.error({ jobId: job?.id, error: err.message }, '[AnalyticsWorker] Job failed');
});
exports.default = analyticsWorker;
//# sourceMappingURL=analytics-worker.js.map