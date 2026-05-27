export interface SubsystemMetrics {
    name: string;
    loc: number;
    incidentsAlerted: number;
    incidentsResolved: number;
    falsePositiveAlerts: number;
    operatorViewsCount: number;
    catastrophicOptionalityWeight?: number; // 0.0 to 1.0, representing how critical it is for preventing catastrophic black-swan incidents
}

export interface RetirementEligibilityReport {
    subsystemName: string;
    efficacyScore: number; // 0.0 to 1.0
    isEligibleForRetirement: boolean;
    reason: string;
}

export class SubsystemRetirementEvaluator {
    private readonly efficacyThreshold = 0.25;
    private readonly minimalLocThreshold = 100;

    /**
     * Evaluates whether a subsystem is eligible for deletion/retirement
     * based on its code footprint, false positive rate, operator utility, and catastrophic optionality.
     */
    public evaluateRetirement(subsystem: SubsystemMetrics): RetirementEligibilityReport {
        const totalAlerts = subsystem.incidentsAlerted + subsystem.falsePositiveAlerts;
        
        // Resolution weight (how often alerts lead to resolutions)
        const resolutionRatio = subsystem.incidentsAlerted > 0 
            ? subsystem.incidentsResolved / subsystem.incidentsAlerted 
            : 0;

        // Attention ratio (how often operator views dashboard/incident details vs alerts + false positives)
        const totalAuditedEvents = Math.max(10, totalAlerts + subsystem.operatorViewsCount);
        const attentionRatio = subsystem.operatorViewsCount / totalAuditedEvents;

        // Composite efficacy score
        const efficacyScore = (resolutionRatio * 0.50) + (attentionRatio * 0.50);
        const roundedEfficacy = Math.round(efficacyScore * 100) / 100;

        let isEligibleForRetirement = false;
        let reason = `Subsystem is operationally active and useful (Efficacy: ${(roundedEfficacy * 100).toFixed(0)}%).`;

        const optWeight = subsystem.catastrophicOptionalityWeight ?? 0;

        if (optWeight >= 0.70) {
            isEligibleForRetirement = false;
            reason = `Excluded from retirement due to high Catastrophic Optionality Weighting (${(optWeight * 100).toFixed(0)}% >= 70%). Low-frequency catastrophic value is preserved for black-swan incidents.`;
        } else if (subsystem.loc >= this.minimalLocThreshold && efficacyScore < this.efficacyThreshold) {
            isEligibleForRetirement = true;
            reason = `Eligible for retirement. Low efficacy score (${(roundedEfficacy * 100).toFixed(0)}% < ${(this.efficacyThreshold * 100).toFixed(0)}%) with significant codebase footprint (${subsystem.loc} LOC). High noise/false-positives or low operator interest.`;
        } else if (subsystem.loc < this.minimalLocThreshold) {
            reason = `Excluded from retirement. Footprint (${subsystem.loc} LOC) is below the minimal threshold (${this.minimalLocThreshold} LOC) to justify complexity deletion overhead.`;
        }

        return {
            subsystemName: subsystem.name,
            efficacyScore: roundedEfficacy,
            isEligibleForRetirement,
            reason
        };
    }
}
