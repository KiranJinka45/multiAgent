/**
 * ─── ZTAN Monotonic Source Validator ──────────────────────────────────────────
 * Classifies the reliability of process.hrtime.bigint() ticks, detecting clock
 * warping, VM suspend/resume timing anomalies, and timer frequency drift.
 * ────────────────────────────────────────────────────────────────────────────
 */

export enum MonotonicSourceStatus {
    TRUSTED = 'TRUSTED',
    DEGRADED = 'DEGRADED',
    UNTRUSTED = 'UNTRUSTED'
}

export interface MonotonicValidationReport {
    status: MonotonicSourceStatus;
    skewMs: number;
    driftPpm: number;
    reasons: string[];
}

export class MonotonicSourceValidator {
    /**
     * Checks if monotonic ticks correspond cleanly to wall-time steps.
     */
    validate(snapshots: Array<{ timestampMs: number; monotonicNs: string }>): MonotonicValidationReport {
        const report: MonotonicValidationReport = {
            status: MonotonicSourceStatus.TRUSTED,
            skewMs: 0,
            driftPpm: 0,
            reasons: []
        };

        if (snapshots.length < 2) {
            return report;
        }

        let totalSkewMs = 0;
        let lastMonotonic = BigInt(snapshots[0].monotonicNs);

        for (let i = 1; i < snapshots.length; i++) {
            const prev = snapshots[i - 1];
            const curr = snapshots[i];
            const currMonotonic = BigInt(curr.monotonicNs);

            // 1. Monotonic ticks must never go backward
            if (currMonotonic < lastMonotonic) {
                report.status = MonotonicSourceStatus.UNTRUSTED;
                report.reasons.push(`[MONOTONIC_BACKWARD] Monotonic clock ticks went backward: ${lastMonotonic} -> ${currMonotonic}`);
            }

            const wallDelta = curr.timestampMs - prev.timestampMs;
            const monoDeltaNs = currMonotonic - BigInt(prev.monotonicNs);
            const monoDeltaMs = Number(monoDeltaNs / 1000000n);

            // 2. Detect impossible elapsed intervals (e.g. wall clock is frozen but monotonic ticks warp forward)
            const segmentSkew = Math.abs(wallDelta - monoDeltaMs);
            totalSkewMs += segmentSkew;

            if (segmentSkew > 2000 && wallDelta < 500) {
                report.status = MonotonicSourceStatus.UNTRUSTED;
                report.reasons.push(`[MONOTONIC_WARP] Impossible monotonic tick jump of ${monoDeltaMs}ms while wall clock advanced by ${wallDelta}ms.`);
            }

            lastMonotonic = currMonotonic;
        }

        // Calculate PPM (parts per million) drift
        const first = snapshots[0];
        const last = snapshots[snapshots.length - 1];
        const wallDurationMs = last.timestampMs - first.timestampMs;
        const monoDurationMs = Number((BigInt(last.monotonicNs) - BigInt(first.monotonicNs)) / 1000000n);

        if (wallDurationMs > 0) {
            const driftMs = Math.abs(wallDurationMs - monoDurationMs);
            report.driftPpm = Math.round((driftMs / wallDurationMs) * 1000000);
            report.skewMs = totalSkewMs;

            if (report.driftPpm > 100000) { // > 10% drift
                report.status = MonotonicSourceStatus.UNTRUSTED;
                report.reasons.push(`[CRITICAL_SKEW] Monotonic source drift exceeds 100,000 PPM (${report.driftPpm} PPM).`);
            } else if (report.driftPpm > 20000) { // > 2% drift
                if (report.status !== MonotonicSourceStatus.UNTRUSTED) {
                    report.status = MonotonicSourceStatus.DEGRADED;
                }
                report.reasons.push(`[MONOTONIC_DRIFT] Monotonic source drift is elevated at ${report.driftPpm} PPM.`);
            }
        }

        return report;
    }
}
