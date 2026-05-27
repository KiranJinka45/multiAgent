export interface TelemetryPruningReport {
    totalFields: number;
    recommendedRetirements: string[];
    fieldUtilityScores: Record<string, number>;
}

export class EvidenceReductionEnforcer {
    private readonly utilityThreshold = 0.05;

    /**
     * Identifies low-value telemetry fields that are rarely queried.
     */
    public evaluateTelemetryPruning(
        registeredFields: string[],
        queryFrequency: Record<string, number>
    ): TelemetryPruningReport {
        const fieldUtilityScores: Record<string, number> = {};
        const recommendedRetirements: string[] = [];

        let totalQueries = 0;
        for (const field of registeredFields) {
            totalQueries += queryFrequency[field] || 0;
        }

        for (const field of registeredFields) {
            const freq = queryFrequency[field] || 0;
            const score = totalQueries > 0 ? freq / totalQueries : 0;
            fieldUtilityScores[field] = Math.round(score * 100) / 100;

            if (score < this.utilityThreshold) {
                recommendedRetirements.push(field);
            }
        }

        return {
            totalFields: registeredFields.length,
            recommendedRetirements,
            fieldUtilityScores
        };
    }

    /**
     * Enforces the 2:1 telemetry deletion quota.
     * Every new telemetry field added must be offset by deleting at least 2 existing fields.
     */
    public enforceDeletionQuota(
        newFieldsCount: number,
        retiredFieldsCount: number
    ): { isCompliant: boolean; requiredDeletions: number; surplus: number } {
        const requiredDeletions = newFieldsCount * 2;
        const isCompliant = retiredFieldsCount >= requiredDeletions;
        const surplus = retiredFieldsCount - requiredDeletions;

        return {
            isCompliant,
            requiredDeletions,
            surplus
        };
    }
}
