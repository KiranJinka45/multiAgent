// @ts-nocheck
import { Worker, Job } from '@packages/utils';
import { redis, QUEUE_PATTERN } from '@packages/utils';
import { logger } from '@packages/observability';
import { db } from '@packages/db';

if (!QUEUE_PATTERN) throw new Error("FATAL: QUEUE_PATTERN name must be provided");

export const patternWorker = new Worker(QUEUE_PATTERN, async (job: Job) => {
  logger.info('[PatternWorker] Searching for behavioral patterns...');

  // Pattern discovery uses aggregate queries against execution logs.
  // Cast to `any` because the schema fields (taskType, score, latency)
  // may be stored in the `metadata` JSON column rather than as top-level fields.
  const results = await (db.executionLog as any).groupBy({
    by: ['stage', 'status'],
    _count: { _all: true },
    where: { createdAt: { gte: new Date(Date.now() - 86400000) } }
  });

  for (const res of results) {
    const { stage, status, _count } = res as any;
    
    if (status === 'failed' && _count._all > 5) {
      await db.pattern.create({
        data: {
          name: `failure_pattern_${stage}`,
          description: `High failure rate detected for ${stage}`,
          metadata: { count: _count._all }
        }
      });
    }

    if (status === 'completed' && _count._all > 10) {
      await db.pattern.create({
        data: {
          name: `success_pattern_${stage}`,
          description: `High performance pattern for ${stage}`,
          metadata: { count: _count._all }
        }
      });
    }
  }

  logger.info('[PatternWorker] Pattern discovery complete');
}, { connection: redis });

export default patternWorker;

