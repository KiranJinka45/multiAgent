export interface PolicyRule {
    id: string;
    name: string;
    overlapFields: string[];
    conflictIndex: number; // 0.0 to 1.0 (frequency of contradiction)
    triggerCount: number;
    efficacyScore: number; // 0.0 to 1.0 (usefulness in preventing faults)
}

export interface PruneRecommendation {
    ruleId: string;
    ruleName: string;
    reason: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export class GovernanceShrinker {
    private readonly redundancyThreshold = 0.80; // 80% field overlap

    /**
     * Audits governance policies for redundancy, low utility, and active validator conflicts.
     */
    public auditRuleRedundancy(rules: PolicyRule[]): PruneRecommendation[] {
        const recommendations: PruneRecommendation[] = [];

        for (let i = 0; i < rules.length; i++) {
            const ruleA = rules[i];

            // 1. Check for Low Efficacy
            if (ruleA.efficacyScore < 0.15 && ruleA.triggerCount > 10) {
                recommendations.push({
                    ruleId: ruleA.id,
                    ruleName: ruleA.name,
                    reason: `Low efficacy score (${ruleA.efficacyScore}) despite high trigger count (${ruleA.triggerCount}). Rule is likely noise.`,
                    severity: 'HIGH'
                });
                continue;
            }

            // 2. Check for High Conflict Index (contradictory rules)
            if (ruleA.conflictIndex >= 0.70) {
                recommendations.push({
                    ruleId: ruleA.id,
                    ruleName: ruleA.name,
                    reason: `High conflict index (${ruleA.conflictIndex}). This rule contradicts other active policies too frequently.`,
                    severity: 'MEDIUM'
                });
                continue;
            }

            // 3. Check for Overlap/Redundancy with other rules
            for (let j = 0; j < rules.length; j++) {
                if (i === j) continue;
                const ruleB = rules[j];

                const overlapCount = ruleA.overlapFields.filter(f => ruleB.overlapFields.includes(f)).length;
                const overlapRatio = ruleA.overlapFields.length > 0 ? overlapCount / ruleA.overlapFields.length : 0;

                if (overlapRatio >= this.redundancyThreshold && ruleA.overlapFields.length <= ruleB.overlapFields.length) {
                    recommendations.push({
                        ruleId: ruleA.id,
                        ruleName: ruleA.name,
                        reason: `Redundant. Has ${Math.round(overlapRatio * 100)}% field overlap with larger rule '${ruleB.name}'.`,
                        severity: 'LOW'
                    });
                    break;
                }
            }
        }

        return recommendations;
    }
}
