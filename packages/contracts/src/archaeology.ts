/**
 * @packages/contracts/archaeology
 * 
 * Formal interfaces for Infrastructure Reliability Archaeology.
 */

export interface ArchaeologySnapshot {
    id: string;
    timestamp: string;
    failureType: string;
    service: string;
    nodeVersion: string;
    os: string;
    arch: string;
    latencyMs: number;
    correlations: Record<string, any>;
    fingerprint: string;
}

export interface ArchaeologyIndex {
    version: string;
    snapshots: ArchaeologySnapshot[];
    metadata: {
        totalReplays: number;
        lastUpdated: string;
        recoveryStabilityScore: number;
    };
}

export interface EnvironmentStats {
    nodeVersions: Record<string, number>;
    os: Record<string, number>;
    arch: Record<string, number>;
}

export interface StabilityForecast {
    trend: 'IMPROVING' | 'DEGRADING' | 'STABLE';
    projectedVariance: number;
}

export interface RehearsalRequest {
    target: string;
    testSuite: string;
}

export interface RehearsalResponse {
    target: string;
    status: 'SUCCESS' | 'FAILURE';
    latencyMs: number;
    error?: string;
    timestamp: string;
}
