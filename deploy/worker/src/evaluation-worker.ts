// @ts-nocheck
import { Worker, Job } from '@packages/utils';
import { redis, QUEUE_EVALUATION } from '@packages/utils';
import { logger } from '@packages/observability';
import { db } from '@packages/db';

if (!QUEUE_EVALUATION) throw new Error("FATAL: QUEUE_EVALUATION name must be provided");

export const evaluationWorker = new Worker(QUEUE_EVALUATION, async (job: Job) => {
  logger.info({ jobId: job.id }, '[EvaluationWorker] Starting execution log analysis');

  const lastHour = new Date(Date.now() - 3600000);
  
  // Fetch recent logs for evaluation
  const logs = await db.executionLog.findMany({
    where: { 
      createdAt: { gte: lastHour }
    }
  });

  logger.info({ count: logs.length }, '[EvaluationWorker] Scoring recent logs');

  for (const log of logs) {
    let score = 0;
    const meta = (log.metadata as any) || {};

    // Heuristic scoring based on metadata
    if (log.status === 'completed') score += 50;
    
    // Reward lower latency
    const latency = meta.latency ?? meta.durationMs ?? 5000;
    if (latency < 2000) score += 20;
    else if (latency < 5000) score += 10;

    // Reward cost efficiency
    const cost = meta.cost ?? 0;
    if (cost > 0 && cost < 0.005) score += 30;
    else if (cost < 0.01) score += 15;

    // Store score in metadata since ExecutionLog doesn't have a score column
    await db.executionLog.update({
      where: { id: log.id },
      data: { metadata: { ...meta, score } }
    });
  }

  logger.info('[EvaluationWorker] Evaluation batch complete');
}, { connection: redis });

export default evaluationWorker;

