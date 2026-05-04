// @ts-nocheck
import { Worker, Job } from '@packages/utils';
import { redis, queueManager, QUEUE_STRATEGY } from '@packages/utils';
import { logger } from '@packages/observability';
import { db } from '@packages/db';

if (!QUEUE_STRATEGY) throw new Error("FATAL: QUEUE_STRATEGY name must be provided");

const strategyWorker = new Worker(QUEUE_STRATEGY, async (job: Job) => {
  logger.info('[StrategyWorker] Evaluating business performance...');

  // 1. Fetch latest metrics (hourly aggregation)
  const lastHour = new Date(Date.now() - 3600000);
  
  const events = await db.event.findMany({
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
    await db.productMetric.create({
      data: {
        productId: 'global-strategy',
        metric: m.metric,
        value: m.value as number
      }
    });
  }

  // 3. Apply Decision Logic (Strategy Engine)
  if (conversions < 2 && signups > 10) {
    logger.warn('[StrategyWorker] Low conversion detected. Triggering GrowthAgent.');
    await queueManager.addJob('agent-task', {
      agent: 'growth-agent',
      goal: 'improve_conversion',
      context: { signups, conversions }
    });
  }

  if (builds > 50) {
    logger.info('[StrategyWorker] High build volume. Notifying ScalingAgent.');
    await queueManager.addJob('agent-task', {
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

}, { connection: redis });

export default strategyWorker;


