// @ts-nocheck
import { Worker, Job } from '@packages/utils';
import { redis, ANALYTICS_QUEUE } from '@packages/utils';
import { logger } from '@packages/observability';
import { db } from '@packages/db';

if (!ANALYTICS_QUEUE) throw new Error("FATAL: ANALYTICS_QUEUE name must be provided");

const analyticsWorker = new Worker(ANALYTICS_QUEUE, async (job: Job) => {
  const { type, userId, tenantId, metadata } = job.data;
  
  logger.info({ type, userId }, '[AnalyticsWorker] Processing event');

  switch (type) {
    case 'conversion':
      // Calculate Trial-to-Paid Conversion rate for the product
      const { productId } = metadata;
      const totalVisits = await db.event.count({
        where: { 
            type: 'resume_submitted',
            data: { path: productId } as any
        } 
      });
      const totalPaid = await db.subscription.count({
        where: { productId, status: 'active' }
      });

      await db.productMetric.create({
        data: {
          productId,
          date: new Date(),
          revenue: totalPaid * 19, // Hardcoded for MVP
          users: totalVisits,
          conversions: totalPaid,
          metadata: { conversionRate: (totalPaid / totalVisits) * 100 }
        } as any
      });
      break;

    case 'churn':
        // Log churn event for autonomous strategy engine to analyze patterns
        logger.warn({ userId, tenantId }, '[AnalyticsWorker] Churn detected. Triggering retention strategy.');
        break;

    default:
      break;
  }
}, { connection: redis });

analyticsWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err.message }, '[AnalyticsWorker] Job failed');
});

export default analyticsWorker;


