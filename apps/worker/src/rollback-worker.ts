// @ts-nocheck
import { Worker, Job } from '@packages/utils';
import { redis, QUEUE_ROLLBACK } from '@packages/utils';
import { logger } from '@packages/observability';
import { db } from '@packages/db';

if (!QUEUE_ROLLBACK) throw new Error("FATAL: QUEUE_ROLLBACK name must be provided");

export const rollbackWorker = new Worker(QUEUE_ROLLBACK, async (job: Job) => {
  const { proposalId } = job.data;
  logger.info({ proposalId }, '[RollbackWorker] Monitoring stability of promoted change');

  const proposal = await db.proposedChange.findUnique({ where: { id: proposalId } });
  if (!proposal || proposal.status !== 'promoted') return;

  // 1. Fetch metrics for the target agent/module after promotion
  const hourAgo = new Date(Date.now() - 3600000);
  const metrics = await (db.executionLog as any).aggregate({
      _avg: { progress: true },
      where: { 
          executionId: proposal.agentId,
          createdAt: { gte: hourAgo }
      }
  });

  // 2. Rollback Logic: If progress drops significantly
  const avgProgress = metrics?._avg?.progress ?? 100;
  const degradation = avgProgress < 60;
  
  if (degradation) {
    logger.error({ proposalId, avgProgress }, '[RollbackWorker] DEGRADATION DETECTED. Executing Emergency Rollback.');
    
    await db.proposedChange.update({
        where: { id: proposalId },
        data: { status: 'rejected' }
    });

    logger.warn(`Emergency Rollback triggered for ${proposal.targetPath}`);
  }
}, { connection: redis });

export default rollbackWorker;

