export interface ExitCriteriaInput {
    netTelemetryGrowthRate: number; // e.g. -0.05 for -5% growth, 0.02 for +2%
    codeChangeRatePerMonth: number; // lines of code modified/added per month
    onboardingSuccessRate: number; // 0.0 to 1.0 (desired >= 0.90)
    activeAlertVolumePerDay: number; // desired <= 1.0
    unresolvedIncidentsCount: number; // desired === 0
}

export interface ExitCertificationReport {
    isCertifiedForArchivalFreeze: boolean;
    unmetCriteria: string[];
    systemState: 'STABILIZED' | 'ACTIVE_REDUCTION' | 'HYPERTROPHIC';
    warnings: string[];
}

export class OperationalExitCertifier {
    /**
     * Evaluates if ZTAN subsystems have achieved exit criteria and are certified
     * for archival freeze and stabilization mode.
     */
    public evaluateExitCriteria(input: ExitCriteriaInput): ExitCertificationReport {
        const unmetCriteria: string[] = [];
        const warnings: string[] = [];

        // 1. Verify net telemetry growth rate is non-positive
        if (input.netTelemetryGrowthRate > 0) {
            unmetCriteria.push(`Telemetry growth rate is positive (${(input.netTelemetryGrowthRate * 100).toFixed(1)}%). Telemetry footprint must be static or shrinking.`);
        }

        // 2. Verify code change rate is practically zero
        if (input.codeChangeRatePerMonth > 5) {
            unmetCriteria.push(`Code change rate is too high (${input.codeChangeRatePerMonth} LOC/month). Development must halt before freeze.`);
        }

        // 3. Verify onboarding success rate is high
        if (input.onboardingSuccessRate < 0.90) {
            unmetCriteria.push(`Onboarding success rate is below threshold (${(input.onboardingSuccessRate * 100).toFixed(0)}% < 90%). Operator capability must be verified.`);
        }

        // 4. Verify alert volumes are low
        if (input.activeAlertVolumePerDay > 1.0) {
            unmetCriteria.push(`Alert volume per day is too high (${input.activeAlertVolumePerDay.toFixed(1)} alerts/day > 1.0). SRE cognitive load must be minimized.`);
        }

        // 5. Verify zero unresolved incidents
        if (input.unresolvedIncidentsCount > 0) {
            unmetCriteria.push(`There are ${input.unresolvedIncidentsCount} unresolved incidents. All active issues must be closed.`);
        }

        const isCertifiedForArchivalFreeze = unmetCriteria.length === 0;

        // Determine system state
        let systemState: 'STABILIZED' | 'ACTIVE_REDUCTION' | 'HYPERTROPHIC' = 'ACTIVE_REDUCTION';
        if (isCertifiedForArchivalFreeze) {
            systemState = 'STABILIZED';
        } else if (input.netTelemetryGrowthRate > 0.10 || input.activeAlertVolumePerDay > 5.0 || input.codeChangeRatePerMonth > 200) {
            systemState = 'HYPERTROPHIC';
            warnings.push('CRITICAL: Governance hypertrophy in progress. Immediately suspend new feature deployment and initiate reduction drills.');
        }

        if (isCertifiedForArchivalFreeze) {
            warnings.push('ZTAN Platform is certified for ARCHIVAL_FREEZE. Enforcing read-only governance configuration gates.');
        }

        return {
            isCertifiedForArchivalFreeze,
            unmetCriteria,
            systemState,
            warnings
        };
    }
}
