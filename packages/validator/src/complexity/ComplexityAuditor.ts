import { logger } from '@packages/observability';

export interface AbstractionProposal {
    id: string;
    description: string;
    operationalGain: string; // Measurable improvement
    economicROI: number; // Estimated savings vs cost
    maintenanceComplexityScore: number; // 1-10
    reliabilityImpact: 'positive' | 'neutral' | 'negative';
}

/**
 * ⚖️ ComplexityAuditor
 * The "Restraint Engine" for ZTAN.
 * Prevents complexity reaccumulation by auditing every new platform abstraction.
 */
export class ComplexityAuditor {
    /**
     * Audits a new feature or abstraction proposal.
     * Rejects if complexity outweighs measurable operational gain.
     */
    auditAbstraction(proposal: AbstractionProposal): { approved: boolean, reason?: string } {
        logger.info({ proposal }, '[ComplexityAuditor] Auditing New Abstraction Proposal');

        // RULE: No new abstraction without measurable operational gain
        if (!proposal.operationalGain || proposal.operationalGain.length < 10) {
            return { approved: false, reason: 'VAGUE_OPERATIONAL_GAIN: Measurable improvement must be clearly defined.' };
        }

        // RULE: Maintenance cost must not exceed ROI
        if (proposal.maintenanceComplexityScore > 7 && proposal.economicROI < 2.0) {
            return { approved: false, reason: 'LOW_ROI_HIGH_COMPLEXITY: Maintenance risk exceeds projected economic gain.' };
        }

        // RULE: Reliability must not be negatively impacted
        if (proposal.reliabilityImpact === 'negative') {
            return { approved: false, reason: 'NEGATIVE_RELIABILITY_IMPACT: Architecture must prioritize system stability.' };
        }

        logger.info({ proposalId: proposal.id }, '[ComplexityAuditor] Abstraction APPROVED for implementation.');
        return { approved: true };
    }

    /**
     * Measures current system "Cognitive Sprawl" (Simulated).
     */
    measureCognitiveSprawl(): number {
        // In a real system, this would count active agent types, interface depth, and orchestration nodes
        return 0.42; // Below 0.5 is considered "Stable/Simple"
    }
}

export const complexityAuditor = new ComplexityAuditor();
