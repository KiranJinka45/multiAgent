"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const utils_1 = require("@packages/utils");
const utils_2 = require("@packages/utils");
const observability_1 = require("@packages/observability");
const db_1 = require("@packages/db");
if (!utils_2.QUEUE_BILLING)
    throw new Error("FATAL: QUEUE_BILLING name must be provided");
const billingWorker = new utils_1.Worker(utils_2.QUEUE_BILLING, async (job) => {
    const { type, data } = job.data;
    observability_1.logger.info({ type, jobId: job.id }, '[BillingWorker] Processing billing event');
    if (type === 'subscription_created') {
        const session = data;
        const userId = session.client_reference_id;
        const { tenantId, productId } = session.metadata;
        // 1. Ensure Subscription exists in DB
        await db_1.db.subscription.upsert({
            where: { stripeId: session.subscription },
            update: { status: 'active' },
            create: {
                tenantId,
                stripeId: session.subscription,
                status: 'active',
            },
        });
        // 2. Track Event via Audit Log
        await db_1.db.auditLog.create({
            data: {
                tenantId,
                userId,
                action: 'payment_success',
                resource: productId,
                metadata: { stripeId: session.subscription },
                hash: `payment:${session.subscription}`,
                ipAddress: '127.0.0.1'
            }
        });
        // 3. Trigger Growth Agent via general agent-task queue
        await utils_2.queueManager.addJob('agent-task', {
            agent: 'growth-agent',
            goal: 'on_new_customer',
            context: { userId, tenantId, productId }
        });
        observability_1.logger.info({ userId, productId }, '[BillingWorker] Successfully processed subscription and triggered growth loop');
    }
}, { connection: utils_2.redis });
billingWorker.on('failed', (job, err) => {
    observability_1.logger.error({ jobId: job?.id, error: err.message }, '[BillingWorker] Job failed');
});
exports.default = billingWorker;
//# sourceMappingURL=billing-worker.js.map