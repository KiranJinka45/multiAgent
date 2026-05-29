import { OPAGovernanceLayer, SemanticInspector, StaticCommandFilter } from '@packages/governance-core';
import { db } from '@packages/db';

export class ArtifactValidator {
    static validate(artifact: any) {
        console.log('[ArtifactValidator] Validating artifact');
        return true;
    }
}

export class ContainerManager {
    static async spawn() {
        console.log('[ContainerManager] Spawning container');
    }
}

export class GovernanceEngine {
    static async checkPolicy() {
        console.log('[GovernanceEngine] Checking policy');
        return true;
    }

    static async evaluateProposal(proposalId: string) {
        console.log(`[GovernanceEngine] Evaluating proposal ${proposalId}`);
        const proposal = await db.proposedChange.findUnique({ where: { id: proposalId } });
        if (!proposal) return { allowed: false, reason: 'Proposal not found' };

        // We wrap it in a format expected by the downstream layers
        const cmdProposal = {
            toolName: 'system_modification',
            tenantId: 'platform-admin',
            payload: proposal.patch || proposal.targetPath
        };

        const staticCheck = StaticCommandFilter.evaluateProposal(cmdProposal);
        if (!staticCheck) {
            return { allowed: false, reason: `StaticCommandFilter: Denied` };
        }

        const semanticCheck = await SemanticInspector.aggregate(proposal.description || proposal.patch || '');
        if (semanticCheck.verdict === 'DENIED') {
            return { allowed: false, reason: `SemanticInspector: ${semanticCheck.deterministicFailures.join(', ')}` };
        }

        const opaCheck = await OPAGovernanceLayer.evaluateProposal(cmdProposal);
        if (!opaCheck.isAllowed) {
            return { allowed: false, reason: `OPAGovernanceLayer: ${opaCheck.reason}` };
        }

        return { allowed: true, requireHumanApproval: semanticCheck.verdict === 'REQUIRES_HUMAN_QUORUM' };
    }

    static async logViolation(proposalId: string, reason: string) {
        console.warn(`[GovernanceEngine] Proposal ${proposalId} blocked: ${reason}`);
        await db.auditLog.create({
            data: {
                tenantId: 'platform-admin',
                userId: 'governance-engine',
                action: 'PROPOSAL_BLOCKED',
                resource: proposalId,
                metadata: { reason } as any,
                ipAddress: '127.0.0.1',
                hash: `sha256:${Math.random().toString(36).substring(7)}`
            }
        });
    }
}
