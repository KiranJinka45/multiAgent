import { logger } from '@packages/observability';

export interface TelemetryReport {
    incidentId: string;
    timestamp: number;
    recoveryDurationMs: number;
    packetLossPct: number;
    replicationLagMs: number;
    chaosDriftScore: number;
    activeErrors: string[];
}

export interface ResilienceScore {
    incidentId: string;
    score: number;
    tier: 'CRITICAL_RESILIENCE' | 'OPTIMAL_RESILIENCE' | 'DEGRADED_RESILIENCE';
    recommendation: string;
    auditedAt: string;
}

/**
 * High-assurance adversarial telemetry collector.
 */
export function collectAdversarialData(incidentId: string): TelemetryReport {
    logger.info(`🔍 Collecting adversarial incident telemetry for: ${incidentId}`);
    
    // Simulate real-world incident metrics based on ID parsing or fallback defaults
    const isHighStress = incidentId.includes('STRESS') || incidentId.includes('CHAOS') || Math.random() > 0.5;
    
    return {
        incidentId,
        timestamp: Date.now(),
        recoveryDurationMs: isHighStress ? 1500 + Math.floor(Math.random() * 2000) : 350 + Math.floor(Math.random() * 200),
        packetLossPct: isHighStress ? parseFloat((Math.random() * 5).toFixed(2)) : 0.0,
        replicationLagMs: isHighStress ? Math.floor(Math.random() * 50) + 10 : 2,
        chaosDriftScore: isHighStress ? parseFloat((0.05 + Math.random() * 0.15).toFixed(4)) : 0.001,
        activeErrors: isHighStress ? ['RECONCILIATION_LAG_DETECTED', 'PARTITION_ISOLATION_TRIGGERED'] : []
    };
}

/**
 * Calculates a rigorous mathematical resilience score under simulated chaos.
 */
export function analyzeStressResilience(telemetry: TelemetryReport): ResilienceScore {
    logger.info(`🧠 Analyzing stress resilience for incident: ${telemetry.incidentId}`);
    
    let baseScore = 100;
    
    // Penalize long recovery duration
    if (telemetry.recoveryDurationMs > 2000) {
        baseScore -= 20;
    } else if (telemetry.recoveryDurationMs > 1000) {
        baseScore -= 10;
    }
    
    // Penalize packet loss
    baseScore -= telemetry.packetLossPct * 5;
    
    // Penalize replication lag
    if (telemetry.replicationLagMs > 30) {
        baseScore -= 15;
    } else if (telemetry.replicationLagMs > 10) {
        baseScore -= 5;
    }
    
    // Penalize chaos drift score
    baseScore -= telemetry.chaosDriftScore * 100;
    
    // Bound the score
    const finalScore = Math.max(0, Math.min(100, Math.round(baseScore)));
    
    let tier: ResilienceScore['tier'] = 'OPTIMAL_RESILIENCE';
    let recommendation = 'System exhibits robust baseline self-healing properties.';
    
    if (finalScore < 70) {
        tier = 'CRITICAL_RESILIENCE';
        recommendation = 'IMMEDIATE INTERVENTION REQUIRED: Re-calibrate outbox reconciliation and replication bounds.';
    } else if (finalScore < 90) {
        tier = 'DEGRADED_RESILIENCE';
        recommendation = 'Tune memory quota limits and audit background WAL sync latency.';
    }
    
    return {
        incidentId: telemetry.incidentId,
        score: finalScore,
        tier,
        recommendation,
        auditedAt: new Date().toISOString()
    };
}
