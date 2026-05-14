import { EconomicMetric } from './cost-engine.js';

export interface OptimizationRecommendation {
    id: string;
    action: string;
    targetPackage: string;
    expectedSaving: number; // Percentage
    urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    description: string;
}

export class SustainabilityOptimizer {
    /**
     * Analyze economic metrics and suggest sustainability improvements.
     */
    static analyzeSustainability(metrics: EconomicMetric, state: any): OptimizationRecommendation[] {
        const recommendations: OptimizationRecommendation[] = [];

        // Check for low efficiency
        if (metrics.efficiencyScore < 0.7) {
            recommendations.push({
                id: 'OPT-001',
                action: 'COMPACT_REPLAY_PROOFS',
                targetPackage: 'evidence-lifecycle',
                expectedSaving: 0.15,
                urgency: 'MEDIUM',
                description: 'High storage-to-trust ratio detected. Compacting historical replay proofs could reduce storage overhead by 15%.'
            });
        }

        // Check for high cost-per-trust-day
        if (metrics.costPerTrustDay > 0.2) {
            recommendations.push({
                id: 'OPT-002',
                action: 'COMPRESS_CONSTITUTIONAL_EPOCHS',
                targetPackage: 'constitutional-compression',
                expectedSaving: 0.25,
                urgency: 'HIGH',
                description: 'Governance metadata expansion is outpacing trust accumulation. Compressing active constitutional epochs is recommended.'
            });
        }

        // Check for compute entropy
        if (state.replayLatency > 500) {
            recommendations.push({
                id: 'OPT-003',
                action: 'ARCHIVE_AGED_EVIDENCE',
                targetPackage: 'evidence-lifecycle',
                expectedSaving: 0.10,
                urgency: 'LOW',
                description: 'Replay compute cost is rising due to evidence volume. Archiving evidence older than 2 governance epochs will stabilize compute latency.'
            });
        }

        if (recommendations.length > 0) {
            console.warn(`📉 Found ${recommendations.length} sustainability optimizations.`);
        }

        return recommendations;
    }

    /**
     * Assign a sustainability rating (A-F) based on efficiency and trend.
     */
    static calculateSustainabilityRating(efficiencyScore: number): string {
        if (efficiencyScore >= 0.95) return 'A+';
        if (efficiencyScore >= 0.90) return 'A';
        if (efficiencyScore >= 0.80) return 'B';
        if (efficiencyScore >= 0.70) return 'C';
        if (efficiencyScore >= 0.60) return 'D';
        return 'F';
    }
}
