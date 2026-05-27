export interface TelemetryFieldMetadata {
    name: string;
    anomalyRarity: number; // 0.0 to 1.0 (1.0 means extremely rare, 0.0 means common/daily)
    causalCentrality: number; // 0.0 to 1.0 (connectivity in causal graph)
    recoveryContribution: number; // 0.0 to 1.0 (historical SRE utility for MTTR)
    reconstructionWeight: number; // 0.0 to 1.0 (criticality for replay determinism)
}

export interface TelemetryValueReport {
    fieldValues: Record<string, number>;
    recommendedPruning: string[];
    protectedFields: string[];
}

export class RarityTelemetryValuer {
    private readonly valueThreshold = 0.20;
    private readonly protectionThreshold = 0.80;

    /**
     * Evaluates telemetry fields based on forensic rarity and causal centrality
     * rather than naive query frequency.
     */
    public evaluateTelemetryValue(fields: TelemetryFieldMetadata[]): TelemetryValueReport {
        const fieldValues: Record<string, number> = {};
        const recommendedPruning: string[] = [];
        const protectedFields: string[] = [];

        for (const field of fields) {
            // Composite score prioritizing rarity and recovery contribution
            const score = (
                (field.anomalyRarity * 0.35) +
                (field.causalCentrality * 0.25) +
                (field.recoveryContribution * 0.25) +
                (field.reconstructionWeight * 0.15)
            );

            const roundedScore = Math.round(score * 100) / 100;
            fieldValues[field.name] = roundedScore;

            // Protect fields that are extremely rare, causally central, or critical to recovery
            const isProtected = 
                field.anomalyRarity >= this.protectionThreshold || 
                field.recoveryContribution >= this.protectionThreshold ||
                field.reconstructionWeight >= this.protectionThreshold;

            if (isProtected) {
                protectedFields.push(field.name);
            } else if (score < this.valueThreshold) {
                recommendedPruning.push(field.name);
            }
        }

        return {
            fieldValues,
            recommendedPruning,
            protectedFields
        };
    }
}
