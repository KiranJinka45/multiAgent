import { redis } from "./server";

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
export async function updateCertificationState(metrics: any, confidence: number) {
    const status = 
        confidence >= 90 ? 'CERTIFIED' :
        confidence >= 70 ? 'DEGRADED' :
        'UNSAFE';

    const state: CertificationState = {
        status,
        confidence,
        lastChaosRun: new Date().toISOString(),
        metrics,
        updatedAt: new Date().toISOString()
    };

    // TTL of 5 minutes ensures the state "expires" if the daemon dies, 
    // forcing a non-certified state for safety.
    await redis.set('system:certification:live', JSON.stringify(state), 'EX', 300);

    return state;
}

export async function getLiveCertification(): Promise<CertificationState | null> {
    const data = await redis.get('system:certification:live');
    return data ? JSON.parse(data) : null;
}
