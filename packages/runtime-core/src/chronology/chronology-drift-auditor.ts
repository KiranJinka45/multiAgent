import { ClockProvenanceSnapshot } from './clock-provenance-recorder.js';

/**
 * ─── ZTAN Chronology Drift Auditor ──────────────────────────────────────────
 * Evaluates chronological snapshots, checking wall-clock timestamps against
 * monotonic CPU ticks to identify drift slope, acceleration, and inversions.
 * ────────────────────────────────────────────────────────────────────────────
 */

export interface DriftAuditResult {
    maxClockDeltaMs: number;
    driftSlope: number;
    driftAcceleration: number;
    timestampInversions: number;
    uncertaintyWindowMs: number;
    discontinuityDetected: boolean;
    errors: string[];
}

export class ChronologyDriftAuditor {
    /**
     * Audits a series of timing snapshots to discover temporal anomalies.
     */
    analyze(snapshots: ClockProvenanceSnapshot[]): DriftAuditResult {
        const result: DriftAuditResult = {
            maxClockDeltaMs: 0,
            driftSlope: 0,
            driftAcceleration: 0,
            timestampInversions: 0,
            uncertaintyWindowMs: 0,
            discontinuityDetected: false,
            errors: []
        };

        if (snapshots.length < 2) {
            return result;
        }

        let maxDelta = 0;
        let inversions = 0;
        const monotonicDeltas: bigint[] = [];
        const wallDeltas: number[] = [];

        for (let i = 1; i < snapshots.length; i++) {
            const prev = snapshots[i - 1];
            const curr = snapshots[i];

            // 1. Detect timestamp inversions (clock going backwards)
            if (curr.timestampMs < prev.timestampMs) {
                inversions++;
                result.discontinuityDetected = true;
                result.errors.push(`[CHRONOLOGY_INVERSION] Timestamp went backward: ${prev.wallClockIso} -> ${curr.wallClockIso}`);
            }

            // 2. Measure max delta between consecutive wall clocks vs expected increments
            const wallDelta = curr.timestampMs - prev.timestampMs;
            const prevMonotonic = BigInt(prev.monotonicNs);
            const currMonotonic = BigInt(curr.monotonicNs);
            const monoDeltaNs = currMonotonic - prevMonotonic;
            const monoDeltaMs = Number(monoDeltaNs / 1000000n);

            wallDeltas.push(wallDelta);
            monotonicDeltas.push(monoDeltaNs);

            // Compare wall clock step vs monotonic clock step
            const clockDiff = Math.abs(wallDelta - monoDeltaMs);
            if (clockDiff > maxDelta) {
                maxDelta = clockDiff;
            }

            // Large time steps indicate discontinuity
            if (clockDiff > 1000) {
                result.discontinuityDetected = true;
                result.errors.push(`[CHRONOLOGY_STEP] Sudden wall-clock step detected: ${clockDiff}ms mismatch compared to monotonic ticks.`);
            }
        }

        // Compute drift slope (how fast wall clock diverges from monotonic)
        const first = snapshots[0];
        const last = snapshots[snapshots.length - 1];
        const totalDurationMs = last.timestampMs - first.timestampMs;
        const totalMonoMs = Number((BigInt(last.monotonicNs) - BigInt(first.monotonicNs)) / 1000000n);

        const absoluteDriftMs = Math.abs(totalDurationMs - totalMonoMs);
        const driftSlope = totalDurationMs > 0 ? absoluteDriftMs / totalDurationMs : 0;

        // Compute drift acceleration (rate of change of drift slope between segments)
        let maxAcceleration = 0;
        if (wallDeltas.length >= 2) {
            for (let i = 1; i < wallDeltas.length; i++) {
                const prevSegmentDrift = Math.abs(wallDeltas[i - 1] - Number(monotonicDeltas[i - 1] / 1000000n));
                const currSegmentDrift = Math.abs(wallDeltas[i] - Number(monotonicDeltas[i] / 1000000n));
                const accel = Math.abs(currSegmentDrift - prevSegmentDrift);
                if (accel > maxAcceleration) {
                    maxAcceleration = accel;
                }
            }
        }

        result.maxClockDeltaMs = maxDelta;
        result.driftSlope = driftSlope;
        result.driftAcceleration = maxAcceleration;
        result.timestampInversions = inversions;
        result.uncertaintyWindowMs = maxDelta + Math.abs(last.ntpOffsetMs);

        return result;
    }
}
