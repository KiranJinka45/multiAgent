import { DriftAuditResult } from './chronology-drift-auditor.js';
import { DiscontinuityIncident } from './runtime-discontinuity-detector.js';
import { MonotonicValidationReport, MonotonicSourceStatus } from './monotonic-source-validator.js';

/**
 * ─── ZTAN Timestamp Confidence Classifier ─────────────────────────────────────
 * Classifies chronological data and logs into distinct trust classifications:
 * - VERIFIED: Stable chronology, minimal clock drift.
 * - DEGRADED: Minor drift, low-level CPU scheduler starvation.
 * - UNTRUSTED: Chronology step or VM suspend/resume detected.
 * - INVALID: Cryptographic timestamp inversion or corrupted timings.
 * ────────────────────────────────────────────────────────────────────────────
 */

export enum ChronologyTrustStatus {
    VERIFIED = 'VERIFIED',
    DEGRADED = 'DEGRADED',
    UNTRUSTED = 'UNTRUSTED',
    INVALID = 'INVALID'
}

export interface ChronologyTrustReport {
    status: ChronologyTrustStatus;
    score: number;
    confidenceIntervalMs: number;
    reasons: string[];
}

export class TimestampConfidenceClassifier {
    /**
     * Evaluates drift, discontinuity, and monotonic telemetry to output a trust report.
     */
    classify(
        driftResult: DriftAuditResult,
        incidents: DiscontinuityIncident[],
        monotonicReport?: MonotonicValidationReport
    ): ChronologyTrustReport {
        const report: ChronologyTrustReport = {
            status: ChronologyTrustStatus.VERIFIED,
            score: 100,
            confidenceIntervalMs: driftResult.uncertaintyWindowMs,
            reasons: []
        };

        // Check monotonic clock validation
        if (monotonicReport) {
            if (monotonicReport.status === MonotonicSourceStatus.UNTRUSTED) {
                report.status = ChronologyTrustStatus.INVALID;
                report.score = 10;
                report.reasons.push(...monotonicReport.reasons.map(r => `[MONOTONIC_UNTRUSTED] ${r}`));
                return report;
            } else if (monotonicReport.status === MonotonicSourceStatus.DEGRADED) {
                report.status = ChronologyTrustStatus.DEGRADED;
                report.score = 75;
                report.reasons.push(...monotonicReport.reasons.map(r => `[MONOTONIC_DEGRADED] ${r}`));
            }
        }

        // 1. Check for Invalid cases (Timestamp Inversions)
        if (driftResult.timestampInversions > 0) {
            report.status = ChronologyTrustStatus.INVALID;
            report.score = 0;
            report.reasons.push(`[INVERSION] Detected ${driftResult.timestampInversions} timestamp inversion events.`);
            return report;
        }

        // 2. Check for Untrusted cases (Discontinuities / VM Suspend / Thread Starvation)
        const vmSuspends = incidents.filter(i => i.type === 'VM_SUSPEND_RESUME').length;
        const starvationEvents = incidents.filter(i => i.type === 'THREAD_STARVATION').length;

        if (vmSuspends > 0) {
            report.status = ChronologyTrustStatus.UNTRUSTED;
            report.score = Math.max(10, 50 - vmSuspends * 10);
            report.reasons.push(`[VM_SUSPEND] Detected ${vmSuspends} VM pause/resume events.`);
        }

        if (driftResult.discontinuityDetected) {
            report.status = ChronologyTrustStatus.UNTRUSTED;
            report.score = Math.min(report.score, 40);
            report.reasons.push('[DISCONTINUITY] Large clock step detected in logs.');
        }

        if (report.status === ChronologyTrustStatus.UNTRUSTED) {
            if (starvationEvents > 0) {
                report.reasons.push(`[STARVATION] Detected ${starvationEvents} scheduler starvation events.`);
            }
            return report;
        }

        // 3. Check for Degraded cases (Minor drift, scheduler lag)
        if (driftResult.driftSlope > 0.05) {
            report.status = ChronologyTrustStatus.UNTRUSTED;
            report.score = 30;
            report.reasons.push(`[CRITICAL_DRIFT] Drift slope is highly critical (${(driftResult.driftSlope * 100).toFixed(2)}%).`);
            return report;
        }

        if (driftResult.driftSlope > 0.01) {
            report.status = ChronologyTrustStatus.DEGRADED;
            report.score = 70;
            report.reasons.push(`[CLOCK_DRIFT] Clock drift slope exceeds baseline (${(driftResult.driftSlope * 100).toFixed(2)}%).`);
        }

        if (starvationEvents > 0) {
            report.status = ChronologyTrustStatus.DEGRADED;
            report.score = Math.min(report.score, 80 - starvationEvents * 5);
            report.reasons.push(`[SCHEDULER_LAG] Observed ${starvationEvents} minor CPU thread starvation incidents.`);
        }

        if (driftResult.maxClockDeltaMs > 100) {
            report.status = ChronologyTrustStatus.DEGRADED;
            report.score = Math.min(report.score, 85);
            report.reasons.push(`[DELTA_DEGRADATION] Max clock delta exceeds 100ms (${driftResult.maxClockDeltaMs}ms).`);
        }

        // Final score calibration for VERIFIED status
        if (report.status === ChronologyTrustStatus.VERIFIED) {
            report.score = Math.max(90, 100 - Math.round(driftResult.driftSlope * 1000));
        }

        return report;
    }
}
