import { PolicyRule } from '../adversarial/governance-shrinker.js';
import { Alert } from '../archaeology/operator-load-reducer.js';

export interface StewardshipDensityReport {
    ruleInteractionCount: number;
    operatorDecisionBranches: number;
    alertDependencyGraphDepth: number;
    configurationSurfaceArea: number;
    entropyDensityIndex: number; // 0.0 to 1.0 scale
    isHypertrophic: boolean;
    warnings: string[];
}

export class StewardshipDensityTracker {
    private readonly entropyThreshold = 0.65;

    /**
     * Measures multidimensional stewardship density metrics beyond raw lines of code.
     */
    public measureStewardshipDensity(
        rules: PolicyRule[],
        alerts: Alert[],
        configKeysCount: number,
        operatorPlaybookBranches: number
    ): StewardshipDensityReport {
        // 1. Calculate Rule Interaction Count (shared fields overlap across all rule pairs)
        let ruleInteractionCount = 0;
        for (let i = 0; i < rules.length; i++) {
            for (let j = i + 1; j < rules.length; j++) {
                const ruleA = rules[i];
                const ruleB = rules[j];
                const sharedFields = ruleA.overlapFields.filter(f => ruleB.overlapFields.includes(f));
                ruleInteractionCount += sharedFields.length;
            }
        }

        // 2. Calculate Alert Dependency Graph Depth (longest sequential chain of cascading alert types)
        // Group alerts by type and find how many unique cascading stages they represent.
        const uniqueAlertTypes = new Set(alerts.map(a => a.type));
        const alertDependencyGraphDepth = uniqueAlertTypes.size;

        // 3. Compute Entropy Density Index (composite SRE operational complexity metric)
        // Normalizes and weights complexity inputs
        const normInteractions = Math.min(1.0, ruleInteractionCount / 20);
        const normBranches = Math.min(1.0, operatorPlaybookBranches / 10);
        const normAlertDepth = Math.min(1.0, alertDependencyGraphDepth / 5);
        const normConfigArea = Math.min(1.0, configKeysCount / 50);

        const entropyDensityIndex = (
            (normInteractions * 0.30) +
            (normBranches * 0.25) +
            (normAlertDepth * 0.25) +
            (normConfigArea * 0.20)
        );

        const roundedEntropy = Math.round(entropyDensityIndex * 100) / 100;
        const isHypertrophic = roundedEntropy >= this.entropyThreshold;
        const warnings: string[] = [];

        if (isHypertrophic) {
            warnings.push('Operational entropy density threshold exceeded. The stewardship surface is too complex for human cognition.');
        }
        if (ruleInteractionCount > 15) {
            warnings.push(`High rule coupling detected (${ruleInteractionCount} interactions). Prune overlapping policy parameters.`);
        }
        if (alertDependencyGraphDepth > 4) {
            warnings.push(`Deep alert cascades detected (Depth ${alertDependencyGraphDepth}). Verify primary root-cause suppression schemas.`);
        }

        return {
            ruleInteractionCount,
            operatorDecisionBranches: operatorPlaybookBranches,
            alertDependencyGraphDepth,
            configurationSurfaceArea: configKeysCount,
            entropyDensityIndex: roundedEntropy,
            isHypertrophic,
            warnings
        };
    }
}
