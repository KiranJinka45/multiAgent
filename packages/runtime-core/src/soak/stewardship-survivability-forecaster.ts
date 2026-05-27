export interface StewardshipStaffingMetrics {
    activeStewardsCount: number;
    monthlyTicketVolume: number;
    stalePlaybooksCount: number;
    averageOnboardingDays: number;
    monthlyOvertimeHoursPerSteward: number;
}

export interface SurvivabilityForecastReport {
    attritionRiskPercent: number;
    busFactorCollapse: boolean;
    abandonmentProbabilityPercent: number;
    onboardingHalfLifeDays: number;
    overallStewardshipSurvivabilityRating: 'STABLE' | 'DEGRADED' | 'CRITICAL';
    recommendations: string[];
}

export class StewardshipSurvivabilityForecaster {
    /**
     * Forecasts long-term stewardship survivability, modeling maintainer attrition,
     * bus factor collapse, and abandonment risk.
     */
    public forecastSurvivability(metrics: StewardshipStaffingMetrics): SurvivabilityForecastReport {
        // 1. Calculate attrition risk (burnout increases with overtime and ticket density)
        const ticketDensity = metrics.activeStewardsCount > 0 ? metrics.monthlyTicketVolume / metrics.activeStewardsCount : 0;
        const attritionScore = (metrics.monthlyOvertimeHoursPerSteward * 3.5) + (ticketDensity * 0.8);
        const attritionRiskPercent = Math.min(100, Math.round(attritionScore));

        // 2. Bus factor collapse check (critical risk if team size is too small)
        const busFactorCollapse = metrics.activeStewardsCount <= 2;

        // 3. Stewardship abandonment probability (stale docs + attrition compound the risk)
        const abandonmentScore = (metrics.stalePlaybooksCount * 6) + (attritionRiskPercent * 0.4);
        const abandonmentProbabilityPercent = Math.min(100, Math.round(abandonmentScore));

        // 4. Onboarding half-life (effective timeline for new hires to reach autonomy)
        const onboardingHalfLifeDays = Math.round(metrics.averageOnboardingDays * 0.5);

        // 5. Determine overall rating
        let overallStewardshipSurvivabilityRating: 'STABLE' | 'DEGRADED' | 'CRITICAL' = 'STABLE';
        const recommendations: string[] = [];

        if (attritionRiskPercent >= 70 || busFactorCollapse || abandonmentProbabilityPercent >= 80) {
            overallStewardshipSurvivabilityRating = 'CRITICAL';
        } else if (attritionRiskPercent >= 40 || abandonmentProbabilityPercent >= 50) {
            overallStewardshipSurvivabilityRating = 'DEGRADED';
        }

        // Formulate actionable recommendations
        if (busFactorCollapse) {
            recommendations.push('Bus factor is critically low (<= 2 SREs). Cross-train additional maintainers immediately.');
        }
        if (attritionRiskPercent >= 50) {
            recommendations.push(`High attrition risk (${attritionRiskPercent}%). Prune dashboard noise and shift-alert volumes to reduce SRE burnout.`);
        }
        if (abandonmentProbabilityPercent >= 60) {
            recommendations.push('Stewardship abandonment probability is high. Consolidate and delete stale playbooks.');
        }

        return {
            attritionRiskPercent,
            busFactorCollapse,
            abandonmentProbabilityPercent,
            onboardingHalfLifeDays,
            overallStewardshipSurvivabilityRating,
            recommendations
        };
    }
}
