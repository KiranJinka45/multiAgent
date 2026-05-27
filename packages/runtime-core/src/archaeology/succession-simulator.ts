export interface SuccessionInput {
    playbooks: Array<{
        name: string;
        clarityScore: number; // 0.0 to 1.0
        stepByStepGuideAvailable: boolean;
        updatedWithinDays: number;
    }>;
    scarTissueWarnings: string[];
    overrideRecords: Array<{
        overrideId: string;
        hasStructuredRationale: boolean;
        hasCausalAncestry: boolean;
    }>;
    historicalThawsCount: number;
}

export interface SuccessionReport {
    successionReadinessScore: number; // 0.0 to 1.0
    readinessLevel: 'CRITICAL' | 'LOW' | 'OPTIMAL';
    playbookCoverage: number; // 0.0 to 1.0
    overrideTraceability: number; // 0.0 to 1.0
    scarTissueCognitiveLoad: number; // 0.0 to 1.0
    remediationActions: string[];
}

export class SuccessionSimulator {
    /**
     * Simulates SRE institutional succession readiness by evaluating playbooks readability,
     * override traceability, and scar tissue cognitive overhead.
     */
    public simulateSuccession(input: SuccessionInput): SuccessionReport {
        const playbooksCount = input.playbooks.length;
        const overridesCount = input.overrideRecords.length;

        // 1. Calculate Playbook Coverage
        let clearPlaybooks = 0;
        for (const pb of input.playbooks) {
            if (pb.clarityScore >= 0.70 && pb.stepByStepGuideAvailable && pb.updatedWithinDays <= 180) {
                clearPlaybooks++;
            }
        }
        const playbookCoverage = playbooksCount > 0 ? clearPlaybooks / playbooksCount : 1.0;

        // 2. Calculate Override Traceability
        let traceableOverrides = 0;
        for (const o of input.overrideRecords) {
            if (o.hasStructuredRationale && o.hasCausalAncestry) {
                traceableOverrides++;
            }
        }
        const overrideTraceability = overridesCount > 0 ? traceableOverrides / overridesCount : 1.0;

        // 3. Calculate Scar Tissue Cognitive Load (increases with thaws and scar tissue)
        const scarTissueCount = input.scarTissueWarnings.length;
        const rawLoad = (scarTissueCount * 0.15) + (input.historicalThawsCount * 0.05);
        const scarTissueCognitiveLoad = Math.min(1.0, Math.round(rawLoad * 100) / 100);

        // 4. Calculate Succession Readiness Score (0.0 to 1.0)
        // High playbook coverage, high override traceability, and LOW scar tissue load is ideal.
        const score = (playbookCoverage * 0.40) + (overrideTraceability * 0.40) + ((1 - scarTissueCognitiveLoad) * 0.20);
        const successionReadinessScore = Math.round(score * 100) / 100;

        let readinessLevel: 'CRITICAL' | 'LOW' | 'OPTIMAL' = 'OPTIMAL';
        if (successionReadinessScore < 0.60) {
            readinessLevel = 'CRITICAL';
        } else if (successionReadinessScore < 0.80) {
            readinessLevel = 'LOW';
        }

        // 5. Generate remediation actions
        const remediationActions: string[] = [];
        if (playbookCoverage < 0.80) {
            remediationActions.push('Update stale or unclear playbooks. Ensure each playbook has step-by-step resolution guides.');
        }
        if (overrideTraceability < 0.90) {
            remediationActions.push('Enforce structured rationale logging for SRE overrides to prevent dependency ancestry loss.');
        }
        if (scarTissueCognitiveLoad >= 0.50) {
            remediationActions.push('Accumulated scar tissue cognitive load is high. Run a mandatory simplification campaign to prune stale override channels.');
        }
        if (input.historicalThawsCount >= 5) {
            remediationActions.push('Thaw bypass usage is elevated. Re-certify the operational freeze rules and conduct an archaeology review.');
        }

        if (remediationActions.length === 0) {
            remediationActions.push('Succession readiness is optimal. Institutional memory integrity is fully preserved.');
        }

        return {
            successionReadinessScore,
            readinessLevel,
            playbookCoverage: Math.round(playbookCoverage * 100) / 100,
            overrideTraceability: Math.round(overrideTraceability * 100) / 100,
            scarTissueCognitiveLoad,
            remediationActions
        };
    }
}
