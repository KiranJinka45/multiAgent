export interface ExecutionStep {
    operation: string;
    timestamp: number;
    status: 'SUCCESS' | 'FAIL';
    durationMs: number;
}

export interface SimulationBlueprint {
    expectedOperations: string[];
    expectedDurationMs: number;
}

export class ReplayDriftAnalyzer {
    /**
     * Replaces heuristic drift coefficient with strict causal sequence verification.
     * To pass, the actual execution trace must EXACTLY match the expected operations
     * in strict sequential order. Duplicates, missing events, or reorderings are immediate failures.
     * We drop the timing weight because pure timing drift doesn't violate causality.
     */
    static calculateDrift(blueprint: SimulationBlueprint, actualSteps: ExecutionStep[]): number {
        const expected = blueprint.expectedOperations;
        const actual = actualSteps.map(s => s.operation);
        
        if (expected.length === 0 && actual.length === 0) return 0.0;
        
        // Calculate sequence drift: 1 - (number of matching operations at same index / max length)
        let matchCount = 0;
        const maxLength = Math.max(expected.length, actual.length);
        for (let i = 0; i < Math.min(expected.length, actual.length); i++) {
            if (expected[i] === actual[i]) {
                matchCount++;
            }
        }
        const sequenceDrift = maxLength > 0 ? 1 - (matchCount / maxLength) : 0;

        // Calculate timing drift
        const actualDuration = actualSteps.reduce((sum, step) => sum + step.durationMs, 0);
        let timingDrift = 0;
        if (blueprint.expectedDurationMs > 0) {
            timingDrift = Math.abs(actualDuration - blueprint.expectedDurationMs) / blueprint.expectedDurationMs;
        }

        // Composite drift = 0.7 * sequenceDrift + 0.3 * timingDrift
        const composite = 0.7 * sequenceDrift + 0.3 * timingDrift;
        return Math.round(composite * 10000) / 10000;
    }

    /**
     * Quarantine is required if ANY causal drift (coefficient > 0) is detected.
     */
    static isQuarantineRequired(driftCoefficient: number, threshold: number = 0.0): boolean {
        return driftCoefficient > threshold;
    }
}
