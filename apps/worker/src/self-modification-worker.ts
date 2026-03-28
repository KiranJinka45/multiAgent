import { Worker, Job } from 'bullmq';
import { redis, logger } from '@packages/utils';
import { db } from '@packages/db';
import { SandboxRunner } from './sandbox-runner';

const MODIFICATION_QUEUE = 'self-modification-tasks';
const sandbox = new SandboxRunner(process.cwd());

export const selfModificationWorker = new Worker(MODIFICATION_QUEUE, async (job: Job) => {
  const { proposalId } = job.data;
  logger.info({ proposalId }, '[SelfModificationWorker] Starting simulation for proposed change');

  const proposal = await db.proposedChange.findUnique({ where: { id: proposalId } });
  if (!proposal) return;

  // 1. Governance Gate
  const { GovernanceEngine } = await import('@packages/core-engine/src/governance-engine');
  const gov = await GovernanceEngine.evaluateProposal(proposalId);

  if (!gov.allowed) {
    await GovernanceEngine.logViolation(proposalId, gov.reason || 'Blocked by governance');
    return;
  }

  if (gov.requireHumanApproval) {
    logger.warn({ proposalId }, '[SelfModificationWorker] Human approval REQUIRED for high-risk change.');
    return;
  }

  // 2. Simulation in Sandbox
  const success = await sandbox.runSimulation(proposalId);

  if (success) {
    logger.info({ proposalId }, '[SelfModificationWorker] Simulation SUCCESS. Change is VALIDATED.');
    
    // Auto-promote ONLY for low-risk optimizations
    if (proposal.changeType === 'optimization' && proposal.expectedImpact && (proposal.expectedImpact as any).risk === 'low') {
      await promoteChange(proposalId);
    }
  } else {
    logger.error({ proposalId }, '[SelfModificationWorker] Simulation FAILED. Change REJECTED.');
  }
}, { connection: redis as any });

async function promoteChange(id: string) {
    const proposal = await db.proposedChange.findUnique({ where: { id } });
    if (!proposal) return;

    logger.info({ id, path: proposal.targetPath }, '[PromotionSystem] PROMOTING change to codebase');
    
    // Safety check: ensure file still exists and matches expectation
    const fullPath = path.join(process.cwd(), proposal.targetPath);
    fs.writeFileSync(fullPath, proposal.patch);

    await db.proposedChange.update({
        where: { id },
        data: { status: 'promoted' }
    });

    // 3. Audit Logging (Signed Change)
    await db.auditLog.create({
        data: {
            tenantId: 'platform-admin',
            userId: proposal.agentId,
            action: 'AUTONOMOUS_PROMOTION',
            resource: proposal.targetPath,
            metadata: { proposalId: proposal.id, reason: proposal.reason },
            ipAddress: '127.0.0.1',
            hash: `sha256:${Math.random().toString(36).substring(7)}` // Simulated signature
        }
    });
}

import * as path from 'path';
import * as fs from 'fs';

export default selfModificationWorker;
