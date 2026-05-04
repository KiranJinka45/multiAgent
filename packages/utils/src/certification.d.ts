export interface CertificationState {
    status: 'CERTIFIED' | 'DEGRADED' | 'UNSAFE' | 'UNKNOWN';
    confidence: number;
    lastChaosRun: string;
    metrics: any;
    updatedAt: string;
}
/**
 * CERTIFICATION STATE MANAGER
 * Persists the live system status to Redis for API and Deployment Guard consumption.
 */
export declare function updateCertificationState(metrics: any, confidence: number): Promise<CertificationState>;
export declare function getLiveCertification(): Promise<CertificationState | null>;
//# sourceMappingURL=certification.d.ts.map