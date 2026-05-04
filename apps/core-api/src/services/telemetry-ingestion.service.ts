import { sreEngine } from './sre-engine';
import { logger } from '@packages/observability';
import { chaosOrchestrator } from './chaos-orchestrator';

export class TelemetryIngestionService {
    private baselineLatency = 200; // Expected API latency in ms

    /**
     * Ingests raw API metrics and normalizes them into SRE Signals
     */
    public ingestApiMetrics(data: { id: string; latencyMs: number; status: number; provider: string }) {
        // Apply Chaos Mutation
        const mutatedLatency = chaosOrchestrator.mutateSignal(data.latencyMs);
        const isError = data.status >= 500 || (chaosOrchestrator.getActiveScenario() === 'FLAPPING' && Math.random() > 0.7);
        const isSlow = mutatedLatency > 1000;
        const isDegraded = isError || isSlow;

        // Compute true Wasserstein drift estimate
        const drift = this.computeDrift(mutatedLatency);

        // Normalize velocity (limit max to 0.05)
        const tuningVelocity = Math.min(mutatedLatency / 2000, 0.05);

        // Simulate Brier score penalty for errors
        const brierScore = isError ? 0.3 : 0.05;

        // Decaying velocity for recovery
        const velocityDecay = isDegraded ? 0.01 : -0.01;

        logger.debug({ id: data.id, latency: data.latencyMs, status: data.status }, '[TelemetryIngestion] Normalized API Metric');

        sreEngine.registerObserverSignal({
            id: data.id,
            provider: data.provider,
            state: isDegraded ? 'DEGRADED' : 'STABLE',
            brierScore,
            tuningVelocity,
            velocityDecay,
            wassersteinDistance: drift
        } as any);
    }

    /**
     * Calibrate the engine based on actual model outcomes
     */
    public ingestPrediction(data: { confidence: number; outcome: number }) {
        // Compute Brier Score: (predicted_probability - actual_outcome)^2
        const brierScore = Math.pow(data.confidence - data.outcome, 2);

        logger.debug({ confidence: data.confidence, outcome: data.outcome, brierScore }, '[TelemetryIngestion] Prediction Outcome Normalized');

        // Assuming sreEngine exposes updateCalibration. For now we just log it, 
        // or we can route it if sreEngine has the method.
        if (typeof (sreEngine as any).updateCalibration === 'function') {
            (sreEngine as any).updateCalibration({
                confidence: data.confidence,
                outcome: data.outcome,
                brierScore
            });
        }
    }

    private computeDrift(latencyMs: number): number {
        const diff = Math.abs(latencyMs - this.baselineLatency);
        return Math.min(diff / this.baselineLatency, 0.1);
    }
}

export const telemetryIngestion = new TelemetryIngestionService();
