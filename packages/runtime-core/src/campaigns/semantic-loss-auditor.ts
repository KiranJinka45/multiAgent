/**
 * ZTAN Phase Ω.3 - Compression Irreversibility Auditor
 * 
 * DESIGN CONSTRAINTS:
 * 1. Computes informational entropy collapse under lossy timeline compaction.
 * 2. Bounded, advisory evaluation only. Enforces epistemic honesty.
 * 3. Never mutates live transaction journals.
 */

export interface CausalBranchState {
    nodeId: string;
    branchWeight: number; // probability value representing uncertainty
    variablesCount: number;
}

export interface SemanticCompactionLog {
    stepIndex: number;
    actionType: string;
    prunedFields: string[];
    isCausalSplitPoint: boolean;
}

export interface SemanticLossReport {
    campaignId: string;
    timestamp: number;
    originalBranchesCount: number;
    compactedBranchesCount: number;
    shannonEntropyDelta: number; // amount of informational uncertainty lost (in bits)
    collapsedSplitsCount: number;
    prunedVariablesCount: number;
    epistemicConfidenceScore: number; // 0.0 to 1.0 representing completeness
    advisoryWarnings: string[];
}

export class SemanticLossAuditor {

    /**
     * Calculates Shannon entropy across causal branches to quantify the amount
     * of operational path uncertainty erased during compaction.
     * H(X) = - sum of (p_i * log2(p_i))
     */
    public measureCausalEntropyLoss(
        original: CausalBranchState[],
        compacted: CausalBranchState[]
    ): { originalEntropy: number; compactedEntropy: number; entropyDelta: number } {
        const calcEntropy = (branches: CausalBranchState[]): number => {
            const sum = branches.reduce((acc, b) => acc + b.branchWeight, 0);
            if (sum === 0) return 0;

            let entropy = 0;
            for (const b of branches) {
                const p = b.branchWeight / sum;
                if (p > 0) {
                    entropy -= p * Math.log2(p);
                }
            }
            return Math.round(entropy * 100) / 100;
        };

        const originalEntropy = calcEntropy(original);
        const compactedEntropy = calcEntropy(compacted);
        const entropyDelta = Math.round((originalEntropy - compactedEntropy) * 100) / 100;

        return {
            originalEntropy,
            compactedEntropy,
            entropyDelta
        };
    }

    /**
     * Identifies where telemetry pruning collapsed competing operator hypotheses
     * into a single deterministic representation, reducing chronology resolution accuracy.
     */
    public auditAmbiguityCollapse(
        compactionLogs: SemanticCompactionLog[]
    ): { collapsedSplitsCount: number; prunedVariablesCount: number } {
        let collapsedSplitsCount = 0;
        let prunedVariablesCount = 0;

        for (const log of compactionLogs) {
            prunedVariablesCount += log.prunedFields.length;
            if (log.isCausalSplitPoint && log.prunedFields.length > 0) {
                collapsedSplitsCount++;
            }
        }

        return {
            collapsedSplitsCount,
            prunedVariablesCount
        };
    }

    /**
     * Runs the Compression Irreversibility Audit.
     * Computes the epistemic confidence score of the compacted archaeology capsule.
     */
    public runSemanticLossAudit(
        campaignId: string,
        original: CausalBranchState[],
        compacted: CausalBranchState[],
        compactionLogs: SemanticCompactionLog[]
    ): SemanticLossReport {
        const advisoryWarnings: string[] = [];

        // 1. Calculate entropy delta
        const entropyResult = this.measureCausalEntropyLoss(original, compacted);

        if (entropyResult.entropyDelta > 1.5) {
            advisoryWarnings.push('HIGH SEMANTIC COMPRESSION LOSS: Timeline compaction has removed significant causal branching uncertainty. Reconstructed forensics may over-simplify what actually occurred.');
        }

        // 2. Audit ambiguity collapse details
        const details = this.auditAmbiguityCollapse(compactionLogs);
        if (details.collapsedSplitsCount > 2) {
            advisoryWarnings.push(`AMBIGUITY COLLAPSE: ${details.collapsedSplitsCount} competing timeline branches were merged. Forensic replay will display a linear history, masking historical operator uncertainties.`);
        }

        // 3. Compute Epistemic Confidence Score
        // completeness metric based on remaining branches and entropy retention
        let epistemicConfidenceScore = 1.0;
        if (original.length > 0) {
            const retentionRatio = compacted.length / original.length;
            epistemicConfidenceScore -= (1.0 - retentionRatio) * 0.4;
        }
        if (entropyResult.originalEntropy > 0) {
            const entropyRatio = entropyResult.compactedEntropy / entropyResult.originalEntropy;
            epistemicConfidenceScore -= (1.0 - entropyRatio) * 0.3;
        }
        epistemicConfidenceScore = Math.max(0.1, Math.round(epistemicConfidenceScore * 100) / 100);

        if (epistemicConfidenceScore < 0.65) {
            advisoryWarnings.push('EPISTEMIC RISK: Forensics confidence score falls below stable verification limits. Compacted timeline has lost high-fidelity chronological details.');
        }

        return {
            campaignId,
            timestamp: Date.now(),
            originalBranchesCount: original.length,
            compactedBranchesCount: compacted.length,
            shannonEntropyDelta: entropyResult.entropyDelta,
            collapsedSplitsCount: details.collapsedSplitsCount,
            prunedVariablesCount: details.prunedVariablesCount,
            epistemicConfidenceScore,
            advisoryWarnings
        };
    }
}
