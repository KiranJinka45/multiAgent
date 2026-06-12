import { ReplayDriftAnalyzer } from '../simulation/drift-analyzer.js';
import type { SimulationBlueprint, ExecutionStep } from '../simulation/drift-analyzer.js';

export interface DAGExplosionTest {
    name: string;
    description: string;
}

export class DAGExplosionFuzzer {
    static runFuzzingCampaign(): {
        total: number;
        survived: number;
        exhausted: number;
        results: { test: DAGExplosionTest; survived: boolean; response: string }[]
    } {
        const tests: DAGExplosionTest[] = [
            {
                name: 'Massive Linear Graph (1M edges)',
                description: 'Injects a massive linear sequence to test traversal memory and stack limits.'
            },
            {
                name: 'Pathological Sequence Repetition',
                description: 'Tests performance of validating an extremely repetitive but valid sequence.'
            }
        ];

        let survivedCount = 0;
        let exhaustedCount = 0;
        const results = [];

        for (const test of tests) {
            let survived = true;
            let response = '';

            try {
                if (test.name === 'Massive Linear Graph (1M edges)') {
                    // Try to generate 1 million edges
                    // We'll limit to 1 million. V8 might just OOM or take a long time.
                    const size = 1000000;
                    const expectedOperations: string[] = [];
                    const actualSteps: ExecutionStep[] = [];
                    
                    for (let i = 0; i < size; i++) {
                        expectedOperations.push(`op-${i}`);
                        actualSteps.push({ operation: `op-${i}`, timestamp: i, status: 'SUCCESS', durationMs: 1 });
                    }
                    
                    const blueprint: SimulationBlueprint = { expectedOperations, expectedDurationMs: size };
                    const start = Date.now();
                    ReplayDriftAnalyzer.calculateDrift(blueprint, actualSteps);
                    const duration = Date.now() - start;

                    if (duration > 1000) {
                        survived = false; // Took too long, consider it a computational exhaustion
                        response = `EXHAUSTED: Evaluation took ${duration}ms, exceeding 1000ms SLA.`;
                    } else {
                        response = `SURVIVED: Evaluated 1M edges perfectly in ${duration}ms.`;
                    }
                } 
                else if (test.name === 'Pathological Sequence Repetition') {
                    // Same operation repeated half a million times to test array packing/caching
                    const size = 500000;
                    const expectedOperations = Array(size).fill('repeat-op');
                    const actualSteps = Array(size).fill({ operation: 'repeat-op', timestamp: 0, status: 'SUCCESS', durationMs: 1 });

                    const blueprint: SimulationBlueprint = { expectedOperations, expectedDurationMs: size };
                    const start = Date.now();
                    ReplayDriftAnalyzer.calculateDrift(blueprint, actualSteps);
                    const duration = Date.now() - start;

                    if (duration > 1000) {
                        survived = false;
                        response = `EXHAUSTED: Repetitive evaluation took ${duration}ms, exceeding 1000ms SLA.`;
                    } else {
                        response = `SURVIVED: Evaluated 500k identical elements perfectly in ${duration}ms.`;
                    }
                }

                if (survived) survivedCount++;
                else exhaustedCount++;

            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);
                survived = false;
                exhaustedCount++;
                response = `EXHAUSTED: (Crash/OOM) ${message}`;
            }

            results.push({
                test,
                survived,
                response
            });
        }

        return {
            total: tests.length,
            survived: survivedCount,
            exhausted: exhaustedCount,
            results
        };
    }
}
