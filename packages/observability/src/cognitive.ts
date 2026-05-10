import { Counter, Gauge } from 'prom-client';
import { registry } from './registry.js';

import { logger } from './index.js';


/**
 * 🧠 CognitiveTelemetryEngine
 * Tracks the "mental state" and stability of autonomous agent missions.
 * Prevents cognitive sprawl and runaway orchestration loops.
 */
export class CognitiveTelemetryEngine {
    // ── Cognitive Metrics ──
    
    public reasoningDepth = new Gauge({
        name: 'ztan_ai_reasoning_depth',
        help: 'Current depth of recursive reasoning/sub-tasking',
        labelNames: ['mission_id', 'agent_type'],
        registers: [registry]
    });

    public hallucinationProbability = new Gauge({
        name: 'ztan_ai_hallucination_probability',
        help: 'Estimated probability of current output being a hallucination',
        labelNames: ['mission_id', 'agent_type'],
        registers: [registry]
    });

    public semanticDrift = new Gauge({
        name: 'ztan_ai_semantic_drift',
        help: 'Measured drift from original mission objective (0.0 - 1.0)',
        labelNames: ['mission_id'],
        registers: [registry]
    });

    public correctionLoopCount = new Counter({
        name: 'ztan_ai_correction_loops_total',
        help: 'Number of self-correction attempts in a single mission',
        labelNames: ['mission_id', 'agent_type'],
        registers: [registry]
    });

    /**
     * Calculates the Mission Stability Score (R3JLWM).
     * MISSION STABILITY = (determinism + validation + replay + bounded_reasoning) - (hallucination + retries + drift)
     */
    calculateStabilityScore(metrics: {
        determinism: number;
        validationSuccess: number;
        replayConsistency: number;
        boundedReasoning: number;
        hallucinationRate: number;
        retries: number;
        semanticDrift: number;
    }): number {
        const positive = metrics.determinism + metrics.validationSuccess + metrics.replayConsistency + metrics.boundedReasoning;
        const negative = metrics.hallucinationRate + metrics.retries + metrics.semanticDrift;
        
        const score = positive - negative;
        
        logger.debug({ score, metrics }, '[CognitiveTelemetry] Calculated Mission Stability Score');
        return score;
    }

    /**
     * Triggers a cognitive circuit breaker if instability is detected.
     */
    checkCircuitBreaker(missionId: string, stabilityScore: number): boolean {
        const THRESHOLD = -2.0; // Example threshold for "unstable"
        if (stabilityScore < THRESHOLD) {
            logger.error({ missionId, stabilityScore }, '[CognitiveCircuitBreaker] MISSION_TRIPPED: Excessive cognitive instability detected');
            return true; 
        }
        return false;
    }
}

export const cognitiveTelemetry = new CognitiveTelemetryEngine();
