import { ReplayDriftAnalyzer } from '../simulation/drift-analyzer.js';
import type { SimulationBlueprint, ExecutionStep } from '../simulation/drift-analyzer.js';

export interface EntropyTest {
    name: string;
    blueprint: SimulationBlueprint;
    actualSteps: ExecutionStep[];
    expectedQuarantine: boolean;
}

export class ReplayEntropyFuzzer {
    static runFuzzingCampaign(): {
        total: number;
        correctQuarantines: number;
        falseNegatives: number; // Bad entropy that WAS NOT quarantined
        falsePositives: number; // Benign entropy that WAS quarantined
        results: { test: EntropyTest; drift: number; quarantined: boolean; status: 'CORRECT' | 'FALSE_POSITIVE' | 'FALSE_NEGATIVE' }[]
    } {
        const blueprint: SimulationBlueprint = {
            expectedOperations: ['read-config', 'validate-token', 'write-log', 'send-socket'],
            expectedDurationMs: 200 // 50ms each ideally
        };

        const now = Date.now();

        const tests: EntropyTest[] = [
            {
                name: 'Massive Clock Skew (Stretching)',
                blueprint,
                actualSteps: [
                    { operation: 'read-config', timestamp: now, status: 'SUCCESS', durationMs: 50 },
                    { operation: 'validate-token', timestamp: now + 50, status: 'SUCCESS', durationMs: 50 },
                    { operation: 'write-log', timestamp: now + 100, status: 'SUCCESS', durationMs: 50 },
                    { operation: 'send-socket', timestamp: now + 150, status: 'SUCCESS', durationMs: 5000 } // massive delay
                ],
                // Should definitely quarantine a huge delay
                expectedQuarantine: true
            },
            {
                name: 'Chaotic Event Reordering',
                blueprint,
                actualSteps: [
                    { operation: 'send-socket', timestamp: now, status: 'SUCCESS', durationMs: 50 },
                    { operation: 'write-log', timestamp: now + 50, status: 'SUCCESS', durationMs: 50 },
                    { operation: 'validate-token', timestamp: now + 100, status: 'SUCCESS', durationMs: 50 },
                    { operation: 'read-config', timestamp: now + 150, status: 'SUCCESS', durationMs: 50 }
                ],
                // Completely wrong order should be quarantined
                expectedQuarantine: true
            },
            {
                name: 'Duplicated Events (Replay Attack)',
                blueprint,
                actualSteps: [
                    { operation: 'read-config', timestamp: now, status: 'SUCCESS', durationMs: 50 },
                    { operation: 'validate-token', timestamp: now + 50, status: 'SUCCESS', durationMs: 50 },
                    { operation: 'validate-token', timestamp: now + 100, status: 'SUCCESS', durationMs: 50 }, // Duplicate
                    { operation: 'write-log', timestamp: now + 150, status: 'SUCCESS', durationMs: 50 },
                    { operation: 'send-socket', timestamp: now + 200, status: 'SUCCESS', durationMs: 50 }
                ],
                // Duplicates should be caught
                expectedQuarantine: true
            },
            {
                name: 'Partial Execution Trace (Truncated WAL)',
                blueprint,
                actualSteps: [
                    { operation: 'read-config', timestamp: now, status: 'SUCCESS', durationMs: 50 },
                    { operation: 'validate-token', timestamp: now + 50, status: 'SUCCESS', durationMs: 50 }
                ],
                // Not completing the blueprint should probably quarantine if expected to be atomic
                expectedQuarantine: true
            },
            {
                name: 'Minor Timing Jitter (Benign)',
                blueprint,
                actualSteps: [
                    { operation: 'read-config', timestamp: now, status: 'SUCCESS', durationMs: 52 },
                    { operation: 'validate-token', timestamp: now + 52, status: 'SUCCESS', durationMs: 48 },
                    { operation: 'write-log', timestamp: now + 100, status: 'SUCCESS', durationMs: 60 },
                    { operation: 'send-socket', timestamp: now + 160, status: 'SUCCESS', durationMs: 45 }
                ],
                // Total is ~205. Sequence matches. Should NOT quarantine.
                expectedQuarantine: false
            }
        ];

        let correctQuarantines = 0;
        let falseNegatives = 0;
        let falsePositives = 0;
        const results = [];

        for (const test of tests) {
            const drift = ReplayDriftAnalyzer.calculateDrift(test.blueprint, test.actualSteps);
            const quarantined = ReplayDriftAnalyzer.isQuarantineRequired(drift, 0.5);
            
            let status: 'CORRECT' | 'FALSE_POSITIVE' | 'FALSE_NEGATIVE' = 'CORRECT';
            
            if (quarantined === test.expectedQuarantine) {
                correctQuarantines++;
            } else if (quarantined && !test.expectedQuarantine) {
                falsePositives++;
                status = 'FALSE_POSITIVE';
            } else if (!quarantined && test.expectedQuarantine) {
                falseNegatives++;
                status = 'FALSE_NEGATIVE';
            }

            results.push({
                test,
                drift,
                quarantined,
                status
            });
        }

        return {
            total: tests.length,
            correctQuarantines,
            falseNegatives,
            falsePositives,
            results
        };
    }
}
