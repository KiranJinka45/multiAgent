import { db } from '@libs/db';
import { logger } from '@libs/utils';

export interface GovernanceResult {
  allowed: boolean;
  reason?: string;
  requireHumanApproval: boolean;
}

export class GovernanceEngine {
  private static MAX_DAILY_CHANGES = 5;

  static async evaluateProposal(proposalId: string): Promise<GovernanceResult> {
    const proposal = await db.proposedChange.findUnique({ where: { id: proposalId } });
    if (!proposal) return { allowed: false, reason: 'Proposal not found', requireHumanApproval: false };

    // 1. Check Daily Limit
    const changesToday = await db.proposedChange.count({
      where: {
        status: 'promoted',
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
      }
    });

    if (changesToday >= this.MAX_DAILY_CHANGES) {
      return { allowed: false, reason: 'Daily modification limit reached', requireHumanApproval: false };
    }

    // 2. Check Risk Level via CodeModule
    const module = await db.codeModule.findUnique({ where: { path: proposal.targetPath } });
    if (module && module.riskLevel === 'high') {
      return { 
        allowed: true, 
        reason: 'High risk module detected. Human approval required.', 
        requireHumanApproval: true 
      };
    }

    // 3. Security/Auth Gate
    if (proposal.targetPath.includes('auth') || proposal.targetPath.includes('security')) {
       return { 
        allowed: false, 
        reason: 'Autonomous modification of security layers is strictly prohibited.', 
        requireHumanApproval: false 
      };
    }

    return { allowed: true, requireHumanApproval: false };
  }

  static async logViolation(proposalId: string, reason: string) {
    logger.warn({ proposalId, reason }, '[Governance] Safety violation detected');
    await db.proposedChange.update({
      where: { id: proposalId },
      data: { status: 'rejected', simulationLogs: `Governance Violation: ${reason}` }
    });
  }
}
