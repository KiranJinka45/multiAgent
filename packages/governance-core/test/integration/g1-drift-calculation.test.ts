import { describe, it, expect } from 'vitest';
import { ReplayDriftAnalyzer } from '../../src/simulation/drift-analyzer.js';
import type { ExecutionStep, SimulationBlueprint } from '../../src/simulation/drift-analyzer.js';

describe('Phase G1: Replay Drift Calculation & Quarantine Tests', () => {
    it('should return 0.0 drift for a perfect sequence and timing match', () => {
        const blueprint: SimulationBlueprint = {
            expectedOperations: ['read-file', 'write-file'],
            expectedDurationMs: 100
        };

        const actualSteps: ExecutionStep[] = [
            { operation: 'read-file', timestamp: Date.now(), status: 'SUCCESS', durationMs: 40 },
            { operation: 'write-file', timestamp: Date.now(), status: 'SUCCESS', durationMs: 60 }
        ];

        const drift = ReplayDriftAnalyzer.calculateDrift(blueprint, actualSteps);
        expect(drift).toBe(0.0);
        expect(ReplayDriftAnalyzer.isQuarantineRequired(drift, 0.1)).toBe(false);
    });

    it('should calculate drift correctly when there is sequence mismatch', () => {
        const blueprint: SimulationBlueprint = {
            expectedOperations: ['read-file', 'write-file'],
            expectedDurationMs: 100
        };

        // Out of order execution: write-file executed before read-file
        const actualSteps: ExecutionStep[] = [
            { operation: 'write-file', timestamp: Date.now(), status: 'SUCCESS', durationMs: 40 },
            { operation: 'read-file', timestamp: Date.now(), status: 'SUCCESS', durationMs: 60 }
        ];

        const drift = ReplayDriftAnalyzer.calculateDrift(blueprint, actualSteps);
        // Sequence drift = 1 - 0/2 = 1.0. Timing drift = 0.0.
        // Composite = 0.7 * 1.0 + 0.3 * 0.0 = 0.7.
        expect(drift).toBe(0.7);
        expect(ReplayDriftAnalyzer.isQuarantineRequired(drift, 0.5)).toBe(true);
    });

    it('should calculate drift correctly under timing delays (natural drift)', () => {
        const blueprint: SimulationBlueprint = {
            expectedOperations: ['read-file'],
            expectedDurationMs: 100
        };

        // Execution delayed due to connection latency or disk contention (e.g. total 150ms instead of 100ms)
        const actualSteps: ExecutionStep[] = [
            { operation: 'read-file', timestamp: Date.now(), status: 'SUCCESS', durationMs: 150 }
        ];

        const drift = ReplayDriftAnalyzer.calculateDrift(blueprint, actualSteps);
        // Sequence drift = 0.0.
        // Timing ratio = |150 - 100| / 100 = 0.5.
        // Composite = 0.7 * 0.0 + 0.3 * 0.5 = 0.15.
        expect(drift).toBe(0.15);
        expect(ReplayDriftAnalyzer.isQuarantineRequired(drift, 0.1)).toBe(true);
    });
});
