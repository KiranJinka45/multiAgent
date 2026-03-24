import { Worker, Job } from 'bullmq';
import { redis, logger } from '@libs/utils';
import { db } from '@libs/db';

const PATTERN_QUEUE = 'pattern-discovery';

export const patternWorker = new Worker(PATTERN_QUEUE, async (job: Job) => {
  logger.info('[PatternWorker] Searching for behavioral patterns...');

  const results = await db.executionLog.groupBy({
    by: ['taskType', 'success'],
    _count: { _all: true },
    _avg: { score: true, latency: true },
    where: { createdAt: { gte: new Date(Date.now() - 86400000) } } // Last 24 hours
  });

  for (const res of results) {
    const { taskType, success, _count, _avg } = res;
    
    if (!success && _count._all > 5) {
      await db.pattern.create({
        data: {
          type: 'failure_pattern',
          description: `High failure rate detected for ${taskType}`,
          weight: 0.9,
          metadata: { avgLatency: _avg.latency, count: _count._all }
        }
      });
      
      // Trigger Strategy Re-evaluation
      await db.$executeRawUnsafe(`UPDATE "Strategy" SET "isActive" = false WHERE "agent" = '${taskType}' AND "isActive" = true`);
    }

    if (success && (_avg.score || 0) > 80) {
      await db.pattern.create({
        data: {
          type: 'success_pattern',
          description: `High performance pattern for ${taskType}`,
          weight: 0.7,
          metadata: { avgScore: _avg.score, count: _count._all }
        }
      });
    }
  }

  logger.info('[PatternWorker] Pattern discovery complete');
}, { connection: redis as any });

export default patternWorker;
