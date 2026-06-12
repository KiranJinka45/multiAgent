import { ReplayTrace } from '../chronology/replay-compressor.js';

export interface Hypothesis {
    label: string;
    description: string;
    probability: number; // 0.0 to 1.0
    confidenceInterval: [number, number]; // [min, max]
    supportingEvidence: string[];
}

export interface ProbabilisticReport {
    traceId: string;
    primaryRootCause: string;
    hypotheses: Hypothesis[];
    chronologicalAnomaliesCount: number;
}

export class ProbabilisticExplainabilityEngine {
    /**
     * Examines trace steps to generate competing hypotheses with uncertainty weights.
     */
    public generateHypotheses(trace: ReplayTrace): ProbabilisticReport {
        const hypotheses: Hypothesis[] = [];
        let chronologicalAnomaliesCount = 0;

        if (trace.steps.length === 0) {
            return {
                traceId: trace.traceId,
                primaryRootCause: 'UNKNOWN_EMPTY_TRACE',
                hypotheses: [{
                    label: 'NO_DATA',
                    description: 'The trace does not contain any execution steps.',
                    probability: 1.0,
                    confidenceInterval: [1.0, 1.0],
                    supportingEvidence: ['Trace step array length is 0.']
                }],
                chronologicalAnomaliesCount: 0
            };
        }

        const clockEvidence: string[] = [];
        const gapEvidence: string[] = [];
        const contentionEvidence: string[] = [];

        let prevStep: typeof trace.steps[0] | null = null;
        const actionCounts = new Map<string, number>();

        for (const step of trace.steps) {
            actionCounts.set(step.action, (actionCounts.get(step.action) || 0) + 1);

            if (prevStep) {
                const timeDelta = step.timestamp - prevStep.timestamp;
                const indexDelta = step.index - prevStep.index;

                // 1. Clock skew / temporal inversion checks
                if (timeDelta < 0) {
                    chronologicalAnomaliesCount++;
                    clockEvidence.push(`Step ${step.index} has a timestamp (${step.timestamp}) preceding step ${prevStep.index} (${prevStep.timestamp}) by ${Math.abs(timeDelta)}ms.`);
                }

                // 2. Missing data log checks
                if (indexDelta > 1) {
                    chronologicalAnomaliesCount++;
                    gapEvidence.push(`Step index discontinuity: skipped index from ${prevStep.index} to ${step.index} (${indexDelta - 1} unlogged steps).`);
                }
            }
            prevStep = step;
        }

        // 3. Resource/Lease contention checks
        for (const [action, count] of actionCounts.entries()) {
            if (count > 2 && (action.includes('LEASE') || action.includes('ACQUIRE') || action.includes('LOCK'))) {
                contentionEvidence.push(`High frequency concurrency loop detected for action [${action}]: executed ${count} times.`);
            }
        }

        // Formulate Hypotheses with weight parameters
        const rawClockWeight = clockEvidence.length > 0 ? (0.6 + clockEvidence.length * 0.1) : 0.05;
        const rawGapWeight = gapEvidence.length > 0 ? (0.5 + gapEvidence.length * 0.1) : 0.05;
        const rawContentionWeight = contentionEvidence.length > 0 ? (0.4 + contentionEvidence.length * 0.1) : 0.05;

        // Default baseline weight if no errors exist
        if (clockEvidence.length === 0 && gapEvidence.length === 0 && contentionEvidence.length === 0) {
            hypotheses.push({
                label: 'DETERMINISTIC_COHERENCE',
                description: 'The execution trace follows expected chronological steps with zero anomalies.',
                probability: 0.90,
                confidenceInterval: [0.85, 0.95],
                supportingEvidence: ['All sequence indices are contiguous.', 'Monotonic clock timestamps verified.']
            });
            hypotheses.push({
                label: 'UNDETECTED_STATE_DRIFT',
                description: 'Minor silent drift could exist without triggering structural anomalies.',
                probability: 0.10,
                confidenceInterval: [0.05, 0.15],
                supportingEvidence: ['Lack of explicit drift assertions.']
            });
        } else {
            // Normalize weights so they sum to 1.0
            const totalWeight = rawClockWeight + rawGapWeight + rawContentionWeight;
            
            if (clockEvidence.length > 0) {
                const prob = Math.round((rawClockWeight / totalWeight) * 100) / 100;
                hypotheses.push({
                    label: 'CLOCK_SKEW_OR_VM_DISCONTINUITY',
                    description: 'Low-level hypervisor suspension pause or NTP timing correction step-change.',
                    probability: prob,
                    confidenceInterval: [Math.max(0, prob - 0.1), Math.min(1.0, prob + 0.1)],
                    supportingEvidence: clockEvidence
                });
            }

            if (gapEvidence.length > 0) {
                const prob = Math.round((rawGapWeight / totalWeight) * 100) / 100;
                hypotheses.push({
                    label: 'TELEMETRY_LOG_LOSS_OR_BUFFER_EXHAUSTION',
                    description: 'Network buffer overflow or write-queue drop discarding chronology logs.',
                    probability: prob,
                    confidenceInterval: [Math.max(0, prob - 0.12), Math.min(1.0, prob + 0.12)],
                    supportingEvidence: gapEvidence
                });
            }

            if (contentionEvidence.length > 0) {
                const prob = Math.round((rawContentionWeight / totalWeight) * 100) / 100;
                hypotheses.push({
                    label: 'CONCURRENT_LEASE_ACQUISITION_RACE',
                    description: 'Distributed split-brain contention trying to secure primary node ownership.',
                    probability: prob,
                    confidenceInterval: [Math.max(0, prob - 0.08), Math.min(1.0, prob + 0.08)],
                    supportingEvidence: contentionEvidence
                });
            }

            // Sort hypotheses by probability descending
            hypotheses.sort((a, b) => b.probability - a.probability);
            
            // Adjust last element slightly to ensure total sums to exactly 1.0 due to rounding
            const sum = hypotheses.reduce((acc, h) => acc + h.probability, 0);
            if (sum !== 1.0 && hypotheses.length > 0) {
                hypotheses[0].probability = Math.round((hypotheses[0].probability + (1.0 - sum)) * 100) / 100;
            }
        }

        const primaryRootCause = hypotheses.length > 0 ? hypotheses[0].label : 'UNKNOWN';

        return {
            traceId: trace.traceId,
            primaryRootCause,
            hypotheses,
            chronologicalAnomaliesCount
        };
    }
}
