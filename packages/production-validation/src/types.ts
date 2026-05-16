/**
 * Nexus ZTAN Institutional Production Validation Types
 * (v2026.LTS.1)
 */

export interface OperationalEvidence {
    evidenceId: string;
    timestamp: number;
    category: 'RECOVERY' | 'BURDEN' | 'COGNITION' | 'STABILITY';
    metric: string;
    value: number | string;
    context: Record<string, any>;
    source: string; // e.g., 'ReliabilityEngine', 'ztanctl'
    signature: string;
}

export interface ProductionScorecard {
    institutionId: string;
    period: { start: number; end: number };
    survivabilityIndex: number; // 0-100
    burdenReduction: number; // Percentage
    recoveryConfidence: number; // 0.1 - 1.0
    stabilityTrend: 'IMPROVING' | 'STABLE' | 'DEGRADING';
    cognitionCompliance: boolean;
    evidenceCount: number;
}

export interface ROIReport {
    efficiencyGain: number;
    riskAvoidanceValue: string; // Qualitative/Quantitative
    operatorTimeSavedHours: number;
    autonomousSuccessRate: number;
}
