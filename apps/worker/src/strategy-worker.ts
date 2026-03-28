import { Worker, Job } from 'bullmq';
import { redis, logger, QueueManager } from '@packages/utils';
import { db } from '@packages/db';

const STRATEGY_QUEUE = 'strategy-tasks';

const strategyWorker = new Worker(STRATEGY_QUEUE, async (job: Job) => {
  logger.info('[StrategyWorker] Evaluating business performance...');

  // 1. Fetch latest metrics (hourly aggregation)
  const lastHour = new Date(Date.now() - 3600000);
  
  const events = await db.event.findMany({
    where: { createdAt: { gte: lastHour } }
  });

  const signups = events.filter(e => e.type === 'signup').length;
  const builds = events.filter(e => e.type === 'build_success').length;
  const conversions = events.filter(e => e.type === 'payment_success').length;

  // 2. Persist aggregated metrics
  await db.productMetric.create({
    data: {
      signups,
      conversions,
      revenue: 0, // Placeholder: in real world, sum up payment_success amounts
      activeUsers: 0, // Calculated from sessions
      builds,
      timestamp: new Date()
    }
  });

  // 3. Apply Decision Logic (Strategy Engine)
  if (conversions < 2 && signups > 10) {
    logger.warn('[StrategyWorker] Low conversion detected. Triggering GrowthAgent.');
    await QueueManager.add('agent-task', {
      agent: 'growth-agent',
      goal: 'improve_conversion',
      context: { signups, conversions }
    });
  }

  if (builds > 50) {
    logger.info('[StrategyWorker] High build volume. Notifying ScalingAgent.');
    await QueueManager.add('agent-task', {
      agent: 'scaling-agent',
      goal: 'optimize_infrastructure_costs'
    });
  }

    // 4. LEVEL-4 ADAPTATION: Strategy Evolution
    const agents = ['PlannerAgent', 'CoderAgent', 'CriticAgent'];
    for (const agentName of agents) {
        const avgScore = await db.executionLog.aggregate({
            _avg: { score: true },
            where: { taskType: agentName, createdAt: { gte: lastHour } }
        });

        if (avgScore._avg.score && avgScore._avg.score < 60) {
            logger.warn({ agentName, score: avgScore._avg.score }, '[StrategyWorker] Low agent performance. Generating new strategy.');
            
            // Create a new experiment (A/B Test)
            const currentVersion = await db.strategy.count({ where: { agent: agentName } });
            await db.strategy.create({
                data: {
                    agent: agentName,
                    version: currentVersion + 1,
                    config: {
                        model: 'llama-3.3-70b-versatile',
                        temperature: 0.3 + (Math.random() * 0.4), // Experiment with temperature
                    },
                    isActive: false // Start as candidate
                }
            });
        }

        // 5. Promote Winner
        const bestStrategy = await db.strategy.findFirst({
            where: { agent: agentName },
            orderBy: [{ score: 'desc' }, { createdAt: 'desc' }]
        });

        if (bestStrategy && !bestStrategy.isActive) {
            logger.info({ agentName, version: bestStrategy.version }, '[StrategyWorker] Promoting winning strategy to ACTIVE');
            await db.strategy.updateMany({ where: { agent: agentName }, data: { isActive: false } });
            await db.strategy.update({ where: { id: bestStrategy.id }, data: { isActive: true } });
        }
    }

}, { connection: redis as any });

// In a real system, we would add a repeatable job to this queue
// await QueueManager.add('strategy-tasks', {}, { repeat: { cron: '0 * * * *' } });

export default strategyWorker;
