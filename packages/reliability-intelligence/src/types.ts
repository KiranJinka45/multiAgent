/**
 * Nexus ZTAN Reliability Intelligence Types
 * (v2026.LTS.1)
 */

export interface ReliabilityInference {
    inferenceId: string;
    timestamp: number;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    diagnosis: string;
    rootCause: string;
    evidence: EvidenceItem[];
    confidence: number; // 0.0 - 1.0
    recommendations: RemediationPath[];
    blastRadius: string[]; // Affected node IDs
}

export interface EvidenceItem {
    source: 'METRIC' | 'LOG' | 'EVENT' | 'TOPOLOGY';
    id: string;
    description: string;
    value?: any;
    link?: string;
}

export interface RemediationPath {
    id: string;
    description: string;
    action: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    automated: boolean; // Can it be executed via IntentManifest?
}

export interface PlatformHealthState {
    overallScore: number;
    activeAnomalies: number;
    driftMagnitude: number;
    lastAuditResult: 'PASS' | 'WARN' | 'FAIL';
}
