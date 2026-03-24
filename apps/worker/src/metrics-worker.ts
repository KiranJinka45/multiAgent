import { db } from '@libs/db';
import pino from 'pino';

const logger = pino();

export async function computeBusinessMetrics() {
  logger.info('Starting business metrics aggregation pulse...');
  
  try {
    const products = await db.product.findMany();
    
    for (const product of products) {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // 1. Calculate Signups (Events of type 'signup')
      const signups = await db.event.count({
        where: {
          type: 'signup',
          createdAt: { gte: oneHourAgo }
        }
      });

      // 2. Calculate Conversions (Events of type 'build_started')
      const builds = await db.event.count({
        where: {
          type: 'build_started',
          createdAt: { gte: oneHourAgo }
        }
      });

      // 3. Calculate Revenue (Sum of successful payments)
      const payments = await db.paymentEvent.aggregate({
        _sum: { amount: true },
        where: {
          status: 'succeeded',
          createdAt: { gte: oneHourAgo },
          metadata: { path: ['productId'], equals: product.id }
        }
      });

      const revenue = payments._sum.amount || 0;

      // 4. Update ProductMetric table
      await db.productMetric.create({
        data: {
          productId: product.id,
          date: now,
          revenue: revenue,
          users: signups,
          conversions: builds,
          metadata: {
            conversionRate: signups > 0 ? (builds / signups) : 0,
            period: 'hourly'
          }
        }
      });

      logger.info({ 
        productId: product.id, 
        revenue, 
        signups, 
        builds 
      }, 'Metrics aggregated for product');
    }

    logger.info('Business metrics aggregation complete');
  } catch (error) {
    logger.error({ error }, 'Metrics aggregation failed');
  }
}
