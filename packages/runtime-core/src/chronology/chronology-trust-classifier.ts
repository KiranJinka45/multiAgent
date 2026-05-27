import { TelemetryEvent } from './replay-compressor.js';

export type ChronologyZone = 'MONOTONIC_SECURE' | 'DRIFT_SUSPECT' | 'TEMPORAL_MUTATION' | 'CHRONO_COMPROMISED';

export interface ChronologyZoneReport {
    resurrectionId?: string;
    chronologyZone: ChronologyZone;
    chronologyIntegrityScore: number; // 0.0 to 1.0
    uncertaintyEnvelopeMs: number;
    sourceProvenance: string;
}

export class ChronologyTrustZoneClassifier {
    /**
     * Classifies a telemetry event into defensive Chronology Trust Zones.
     * Evaluates clock steps, VM suspend discontinuities, and NTP offsets.
     */
    public classifyChronoZone(
        event: TelemetryEvent, 
        vmSuspendDetected = false,
        ntpOffsetMs = 0
    ): ChronologyZoneReport {
        let chronologyZone: ChronologyZone = 'MONOTONIC_SECURE';
        let chronologyIntegrityScore = 1.0;
        let uncertaintyEnvelopeMs = 5.0; // Base jitter envelope is ±5ms
        let sourceProvenance = 'System.Clock.Monotonic';

        // 1. Identify VM suspend/resume gaps
        if (vmSuspendDetected) {
            chronologyZone = 'DRIFT_SUSPECT';
            chronologyIntegrityScore = 0.65;
            uncertaintyEnvelopeMs = 500.0; // Spikes uncertainty to ±500ms
            sourceProvenance = 'Hypervisor.TSC.Discontinuity';
        }

        // 2. Identify NTP offset drift severity
        const absOffset = Math.abs(ntpOffsetMs);
        if (absOffset > 1000) {
            // Clock step greater than 1s indicates compromise
            chronologyZone = 'CHRONO_COMPROMISED';
            chronologyIntegrityScore = 0.15;
            uncertaintyEnvelopeMs = absOffset;
            sourceProvenance = 'NTP.Authority.SkewStep';
        } else if (absOffset > 100) {
            chronologyZone = 'TEMPORAL_MUTATION';
            chronologyIntegrityScore = 0.45;
            uncertaintyEnvelopeMs = absOffset;
            sourceProvenance = 'NTP.Synchronization.Drift';
        } else if (absOffset > 10 && chronologyZone === 'MONOTONIC_SECURE') {
            chronologyZone = 'DRIFT_SUSPECT';
            chronologyIntegrityScore = 0.85;
            uncertaintyEnvelopeMs = absOffset;
            sourceProvenance = 'Clock.Provenance.Jitter';
        }

        // 3. Identify backwards chronology step
        const isBackwards = event.payload && event.payload.backwardsChronologyStep === true;
        if (isBackwards) {
            chronologyZone = 'CHRONO_COMPROMISED';
            chronologyIntegrityScore = 0.05;
            uncertaintyEnvelopeMs = 5000.0;
            sourceProvenance = 'Clock.Negative.StepBackwards';
        }

        return {
            resurrectionId: event.id,
            chronologyZone,
            chronologyIntegrityScore: Math.round(chronologyIntegrityScore * 100) / 100,
            uncertaintyEnvelopeMs: Math.round(uncertaintyEnvelopeMs * 100) / 100,
            sourceProvenance
        };
    }
}
