export interface OnboardingReport {
    onboardingHours: number;
    onboardingCostUsd: number;
}

export interface SiloReport {
    siloingIndex: number;
    operationalProductivityMultiplier: number;
}

export interface MemoryDecayReport {
    playbookDecayProbability: number;
    mitigationTrainingHours: number;
    trainingCostUsd: number;
}

export interface TurnoverReport {
    hiringAgencyFeesUsd: number;
    lostProductivityCostUsd: number;
    combinedTurnoverCostUsd: number;
}

export interface CoordinationOverheadReport {
    coordinationHours: number;
    coordinationCostUsd: number;
}

export class HumanDecayEconomicsModel {
    private baseSreHourlyRate: number;
    private onboardingWeeksBaseline: number;

    constructor(baseSreHourlyRate: number = 75.00, onboardingWeeksBaseline: number = 6) {
        this.baseSreHourlyRate = baseSreHourlyRate;
        this.onboardingWeeksBaseline = onboardingWeeksBaseline;
    }

    /**
     * Calculates the productivity hit and direct cost of onboarding new SREs.
     */
    public calculateOnboardingCost(newHiresCount: number): OnboardingReport {
        const onboardingHours = newHiresCount * this.onboardingWeeksBaseline * 40;
        const onboardingCostUsd = onboardingHours * this.baseSreHourlyRate;

        return {
            onboardingHours,
            onboardingCostUsd: Math.round(onboardingCostUsd * 100) / 100
        };
    }

    /**
     * Scores tribal knowledge and expertise siloing risks.
     */
    public calculateSiloingOverhead(siloedSresCount: number, totalSresCount: number): SiloReport {
        if (totalSresCount === 0) return { siloingIndex: 0, operationalProductivityMultiplier: 1.0 };

        const siloingIndex = Math.min(1.0, Math.max(0.0, siloedSresCount / totalSresCount));
        // High siloing reduces productivity (e.g. up to 40% penalty)
        const operationalProductivityMultiplier = 1.0 - (siloingIndex * 0.40);

        return {
            siloingIndex: Math.round(siloingIndex * 100) / 100,
            operationalProductivityMultiplier: Math.round(operationalProductivityMultiplier * 100) / 100
        };
    }

    /**
     * Models institutional memory decay based on stale playbooks and aging runbooks.
     */
    public calculateInstitutionalMemoryDecay(daysSincePlaybookUpdate: number): MemoryDecayReport {
        // Probability of SRE confusion grows by 0.25% per day past 30 days of stale docs
        const daysStale = Math.max(0, daysSincePlaybookUpdate - 30);
        const playbookDecayProbability = Math.min(0.95, daysStale * 0.0025);

        // Required training mitigation hours to refresh team memory
        const mitigationTrainingHours = Math.round(playbookDecayProbability * 40);
        const trainingCostUsd = mitigationTrainingHours * this.baseSreHourlyRate;

        return {
            playbookDecayProbability: Math.round(playbookDecayProbability * 1000) / 1000,
            mitigationTrainingHours,
            trainingCostUsd: Math.round(trainingCostUsd * 100) / 100
        };
    }

    /**
     * Models coordination overhead during incident escalation and consensus override rounds.
     */
    public calculateCoordinationOverhead(activeStewardsCount: number, incidentComplexityFactor: number = 1.0): CoordinationOverheadReport {
        // Coordination hours grows with stewards count (meeting size communication paths: n * (n-1))
        const channelsFactor = 1.0 + (activeStewardsCount * (activeStewardsCount - 1)) * 0.05;
        const coordinationHours = activeStewardsCount * 1.5 * incidentComplexityFactor * channelsFactor;
        const coordinationCostUsd = coordinationHours * this.baseSreHourlyRate;

        return {
            coordinationHours: Math.round(coordinationHours * 100) / 100,
            coordinationCostUsd: Math.round(coordinationCostUsd * 100) / 100
        };
    }

    /**
     * Projects direct and indirect costs when SREs quit due to alert fatigue cognitive decay.
     */
    public calculateTurnoverRecovery(quitCount: number): TurnoverReport {
        // Constant hiring agency fees to secure a new SRE
        const agencyFeePerHire = 6000;
        const hiringAgencyFeesUsd = quitCount * agencyFeePerHire;

        // Lost SRE productivity (160 hours of gap coverage + ramp up penalty)
        const lostHoursPerQuit = 200;
        const lostProductivityCostUsd = quitCount * lostHoursPerQuit * this.baseSreHourlyRate;

        const combinedTurnoverCostUsd = hiringAgencyFeesUsd + lostProductivityCostUsd;

        return {
            hiringAgencyFeesUsd,
            lostProductivityCostUsd,
            combinedTurnoverCostUsd
        };
    }
}
