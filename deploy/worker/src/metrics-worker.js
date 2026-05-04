"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeBusinessMetrics = computeBusinessMetrics;
// @ts-nocheck
const db_1 = require("@packages/db");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)();
async function computeBusinessMetrics() {
    logger.info('Starting business metrics aggregation pulse...');
    try {
        const products = await db_1.db.product.findMany();
        for (const product of products) {
            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
            // 1. Calculate Signups
            const signups = await db_1.db.event.count({
                where: {
                    type: 'signup',
                    createdAt: { gte: oneHourAgo }
                }
            });
            // 2. Calculate Conversions
            const builds = await db_1.db.event.count({
                where: {
                    type: 'build_started',
                    createdAt: { gte: oneHourAgo }
                }
            });
            // 3. Calculate Revenue
            const payments = await db_1.db.paymentEvent.aggregate({
                _sum: { amount: true },
                where: {
                    status: 'succeeded',
                    createdAt: { gte: oneHourAgo }
                    // Prisma PaymentEvent table doesn't have a metadata column or productId in standard schema
                }
            });
            const revenue = payments._sum.amount || 0;
            // 4. Update ProductMetric table
            // ProductMetric only has: id, productId, metric, value, createdAt
            const metrics = [
                { metric: 'revenue', value: revenue },
                { metric: 'users', value: signups },
                { metric: 'conversions', value: builds },
                { metric: 'conversionRate', value: signups > 0 ? (builds / signups) : 0 }
            ];
            for (const m of metrics) {
                await db_1.db.productMetric.create({
                    data: {
                        productId: product.id,
                        metric: m.metric,
                        value: m.value
                    }
                });
            }
            logger.info({
                productId: product.id,
                revenue,
                signups,
                builds
            }, 'Metrics aggregated for product');
        }
        logger.info('Business metrics aggregation complete');
    }
    catch (error) {
        logger.error({ error }, 'Metrics aggregation failed');
    }
}
//# sourceMappingURL=metrics-worker.js.map