import { Worker, Job } from 'bullmq';
import { redis, logger, QueueManager } from '@packages/utils';
import { db } from '@packages/db';

const BILLING_QUEUE = 'billing-events';

const billingWorker = new Worker(BILLING_QUEUE, async (job: Job) => {
  const { type, data } = job.data;
  
  logger.info({ type, jobId: job.id }, '[BillingWorker] Processing billing event');

  if (type === 'subscription_created') {
    const session = data;
    const userId = session.client_reference_id;
    const { tenantId, productId } = session.metadata;

    // 1. Ensure Subscription exists in DB (already created by stripe service if sycnrhonous, but here we enforce it)
    await db.subscription.upsert({
      where: { stripeId: session.subscription },
      update: { status: 'active' },
      create: {
        tenantId,
        userId,
        productId,
        stripeId: session.subscription,
        status: 'active',
      },
    });

    // 2. Track Event
    await db.event.create({
      data: {
        type: 'payment_success',
        userId,
        tenantId,
        metadata: { productId, stripeId: session.subscription }
      }
    });

    // 3. Trigger Growth Agent
    await QueueManager.add('growth-agent', {
      action: 'on_new_customer',
      userId,
      tenantId,
      productId
    });

    logger.info({ userId, productId }, '[BillingWorker] Successfully processed subscription and triggered growth loop');
  }
}, { connection: redis as any });

billingWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err.message }, '[BillingWorker] Job failed');
});

export default billingWorker;
