/**
 * Nexus ZTAN Institutional Production Pilot Types
 * (v2026.LTS.1)
 */

export interface PilotEnvironment {
    pilotId: string;
    environmentName: string;
    status: 'ACTIVE' | 'HIBERNATING' | 'TERMINATED';
    isolationLevel: 'LOGICAL' | 'PHYSICAL';
    currentEpoch: number;
    driftScore: number; // 0.0 - 1.0
}

export interface TrustCalibrationEvent {
    eventId: string;
    timestamp: number;
    recommendationId: string;
    recommendationType: string;
    decision: 'ACCEPTED' | 'REJECTED' | 'MODIFIED';
    operatorId: string;
    reasoning?: string; // Mandatory for REJECTED/MODIFIED
}

export interface PilotScorecard {
    pilotId: string;
    humanTrustScore: number; // 0.0 - 1.0
    recoverySuccessRate: number;
    entropyDetectionLag: number; // ms
    cognitionFriction: number; // Low/Medium/High
    readinessStatus: 'READY' | 'NOT_READY' | 'CERTIFIED';
}
