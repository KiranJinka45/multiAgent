// @ts-nocheck
import { Worker, Job } from '@packages/utils'; type BullJob = Job;
import { redis, queueManager, QUEUE_BILLING } from '@packages/utils';
import { logger } from '@packages/observability';
import { db } from '@packages/db';

if (!QUEUE_BILLING) throw new Error("FATAL: QUEUE_BILLING name must be provided");

const billingWorker = new Worker(QUEUE_BILLING, async (job: BullJob) => {
  const { type, data } = job.data;
  
  logger.info({ type, jobId: job.id }, '[BillingWorker] Processing billing event');

  if (type === 'subscription_created') {
    const session = data;
    const userId = session.client_reference_id;
    const { tenantId, productId } = session.metadata;

    // 1. Ensure Subscription exists in DB
    await (db.subscription as any).upsert({
      where: { stripeId: session.subscription },
      update: { status: 'active' },
      create: {
        tenantId,
        stripeId: session.subscription,
        status: 'active',
      },
    });

    // 2. Track Event via Audit Log
    await db.auditLog.create({
        data: {
            tenantId,
            userId,
            action: 'payment_success',
            resource: productId,
            metadata: { stripeId: session.subscription } as any,
            hash: `payment:${session.subscription}`,
            ipAddress: '127.0.0.1'
        }
    });

    // 3. Trigger Growth Agent via general agent-task queue
    await queueManager.addJob('agent-task', {
      agent: 'growth-agent',
      goal: 'on_new_customer',
      context: { userId, tenantId, productId }
    });

    logger.info({ userId, productId }, '[BillingWorker] Successfully processed subscription and triggered growth loop');
  }
}, { connection: redis });

billingWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err.message }, '[BillingWorker] Job failed');
});

export default billingWorker;


