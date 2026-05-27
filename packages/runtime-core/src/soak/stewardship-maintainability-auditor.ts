export interface MaintenanceMetrics {
    timestamp: number;
    governanceFileCount: number;
    complexityScore: number;
    unactionableAlertsCount: number;
    maintenanceEffortHours: number;
}

export interface MaintainabilityReport {
    complexityGrowthSlopePerMonth: number;
    alertFatigueTrendPerMonth: number;
    maintenanceEffortSlopePerMonth: number;
    stewardshipHypertrophyDetected: boolean;
    recommendations: string[];
}

export class StewardshipMaintainabilityAuditor {
    /**
     * Projects SRE operational maintainability and detects if rules are growing faster than SRE team capacity.
     */
    public evaluateMaintenanceCostSlope(history: MaintenanceMetrics[]): MaintainabilityReport | null {
        if (history.length < 2) return null;

        const firstTime = history[0].timestamp;
        // Convert time to months for readable slopes (1 month = 30 days = 2592000 seconds)
        const relativeTimesMonths = history.map(h => (h.timestamp - firstTime) / (1000 * 60 * 60 * 24 * 30));

        const complexityGrowthSlopePerMonth = this.calculateLinearSlope(
            relativeTimesMonths,
            history.map(h => h.complexityScore)
        );

        const alertFatigueTrendPerMonth = this.calculateLinearSlope(
            relativeTimesMonths,
            history.map(h => h.unactionableAlertsCount)
        );

        const maintenanceEffortSlopePerMonth = this.calculateLinearSlope(
            relativeTimesMonths,
            history.map(h => h.maintenanceEffortHours)
        );

        const recommendations: string[] = [];
        let stewardshipHypertrophyDetected = false;

        // Flags hypertrophy if effort is increasing by more than 2 hours/month or complexity is compounding
        if (maintenanceEffortSlopePerMonth > 2.0) {
            stewardshipHypertrophyDetected = true;
            recommendations.push('Stewardship effort is rising rapidly. Initiate dead code and redundant validator deletion rounds.');
        }

        if (alertFatigueTrendPerMonth > 5.0) {
            stewardshipHypertrophyDetected = true;
            recommendations.push('Unactionable alerts are compounding. Prune low-entropy metrics and collapse alert storms.');
        }

        return {
            complexityGrowthSlopePerMonth: Math.round(complexityGrowthSlopePerMonth * 100) / 100,
            alertFatigueTrendPerMonth: Math.round(alertFatigueTrendPerMonth * 100) / 100,
            maintenanceEffortSlopePerMonth: Math.round(maintenanceEffortSlopePerMonth * 100) / 100,
            stewardshipHypertrophyDetected,
            recommendations
        };
    }

    private calculateLinearSlope(x: number[], y: number[]): number {
        const n = x.length;
        if (n < 2) return 0;

        let sumX = 0;
        let sumY = 0;
        let sumXY = 0;
        let sumXX = 0;

        for (let i = 0; i < n; i++) {
            sumX += x[i];
            sumY += y[i];
            sumXY += x[i] * y[i];
            sumXX += x[i] * x[i];
        }

        const num = (n * sumXY) - (sumX * sumY);
        const den = (n * sumXX) - (sumX * sumX);

        if (den === 0) return 0;
        return num / den;
    }
}
