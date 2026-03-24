import { Worker, Job } from 'bullmq';
import { redis, logger } from '@libs/utils';
import { db } from '@libs/db';
import * as fs from 'fs';
import * as path from 'path';

const ROLLBACK_QUEUE = 'rollback-monitoring';

export const rollbackWorker = new Worker(ROLLBACK_QUEUE, async (job: Job) => {
  const { proposalId } = job.data;
  logger.info({ proposalId }, '[RollbackWorker] Monitoring stability of promoted change');

  const proposal = await db.proposedChange.findUnique({ where: { id: proposalId } });
  if (!proposal || proposal.status !== 'promoted') return;

  // 1. Fetch metrics for the target agent/module after promotion
  const hourAgo = new Date(Date.now() - 3600000);
  const metrics = await db.executionLog.aggregate({
      _avg: { score: true, latency: true },
      where: { 
          taskType: proposal.agentId,
          createdAt: { gte: hourAgo }
      }
  });

  // 2. Rollback Logic: If latency increases by >50% or score drops significantly
  const degradation = (metrics._avg.score || 100) < 60; // Simple threshold
  
  if (degradation) {
    logger.error({ proposalId, score: metrics._avg.score }, '[RollbackWorker] DEGRADATION DETECTED. Executing Emergency Rollback.');
    
    // Recovery: In a real system, we would restore from git or a 'CodeHistory' table.
    // For now, we reject the proposal status and log it.
    await db.proposedChange.update({
        where: { id: proposalId },
        data: { status: 'rejected', reason: 'Performance degradation after promotion' }
    });

    // Notify Engineering
    logger.warn(`Emergency Rollback triggered for ${proposal.targetPath}`);
  }
}, { connection: redis as any });

export default rollbackWorker;
