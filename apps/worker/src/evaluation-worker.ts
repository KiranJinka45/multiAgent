import { Worker, Job } from 'bullmq';
import { redis, logger } from '@packages/utils';
import { db } from '@packages/db';

const EVAL_QUEUE = 'evaluation-tasks';

export const evaluationWorker = new Worker(EVAL_QUEUE, async (job: Job) => {
  logger.info({ jobId: job.id }, '[EvaluationWorker] Starting execution log analysis');

  const lastHour = new Date(Date.now() - 3600000);
  
  // 1. Fetch unscored logs
  const logs = await db.executionLog.findMany({
    where: { 
      score: null,
      createdAt: { gte: lastHour }
    }
  });

  logger.info({ count: logs.length }, '[EvaluationWorker] Scoring recent logs');

  for (const log of logs) {
    let score = 0;

    // A simple heuristic-based scoring engine
    if (log.success) score += 50;
    
    // Reward lower latency (weighted for task complexity)
    if (log.latency < 2000) score += 20;
    else if (log.latency < 5000) score += 10;

    // Reward cost efficiency
    if (log.cost > 0 && log.cost < 0.005) score += 30;
    else if (log.cost < 0.01) score += 15;

    await db.executionLog.update({
      where: { id: log.id },
      data: { score }
    });
  }

  logger.info('[EvaluationWorker] Evaluation batch complete');
}, { connection: redis as any });

export default evaluationWorker;
