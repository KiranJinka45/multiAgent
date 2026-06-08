import { ReplayTrace } from '../chronology/replay-compressor.js';

export interface ExplanationReport {
    summary: string;
    causalChain: string[];
    contradictions: string[];
    ambiguities: string[];
    confidenceScore: number; // 0.0 to 1.0 based on clarity
}

export class OperatorExplainabilityEngine {
    /**
     * Translates a complex replay trace into human-readable causal steps.
     */
    public explainTrace(trace: ReplayTrace): ExplanationReport {
        const causalChain: string[] = [];
        const ambiguities: string[] = [];
        const contradictions: string[] = [];
        
        if (trace.steps.length === 0) {
            return {
                summary: 'Empty execution trace. No operations observed.',
                causalChain,
                contradictions,
                ambiguities,
                confidenceScore: 1.0
            };
        }

        let prevStep: typeof trace.steps[0] | null = null;

        for (const step of trace.steps) {
            const description = `Step ${step.index}: Operator executed [${step.action}] resulting in state hash '${step.stateHash}'`;
            
            if (prevStep) {
                const timeDiffMs = step.timestamp - prevStep.timestamp;
                
                // Track chronology discontinuities or weird gaps
                if (timeDiffMs > 10000) { // >10s gap
                    ambiguities.push(`Unexpected delay of ${timeDiffMs}ms observed between step ${prevStep.index} and step ${step.index}.`);
                } else if (timeDiffMs < 0) {
                    contradictions.push(`Chronological inversion: Step ${step.index} has timestamp prior to step ${prevStep.index}.`);
                }
                
                // Track index skips
                if (step.index !== prevStep.index + 1) {
                    contradictions.push(`Step index sequence discontinuity: Jumped from index ${prevStep.index} to ${step.index}.`);
                }
            }

            // Flag suspicious or obscure actions
            if (step.action.toLowerCase().includes('unknown') || step.action === '') {
                ambiguities.push(`Step ${step.index} has an undefined or obscure action identifier.`);
            }

            causalChain.push(description);
            prevStep = step;
        }

        // Compute confidence based on anomalies
        const penalty = (contradictions.length * 0.25) + (ambiguities.length * 0.1);
        const confidenceScore = Math.max(0.0, 1.0 - penalty);

        // Generate summary sentence
        let summary = `Trace '${trace.traceId}' successfully mapped with ${trace.steps.length} sequential operations.`;
        if (contradictions.length > 0) {
            summary += ` WARNING: ${contradictions.length} timeline contradictions detected. Causal order might be corrupted.`;
        }

        return {
            summary,
            causalChain,
            contradictions,
            ambiguities,
            confidenceScore: Math.round(confidenceScore * 100) / 100
        };
    }

    /**
     * Highlights contradictions between a runtime trace and a trusted gold standard baseline.
     */
    public auditContradictionsAgainstBaseline(
        trace: ReplayTrace,
        baseline: ReplayTrace
    ): string[] {
        const contradictions: string[] = [];

        const baseStepMap = new Map(baseline.steps.map(s => [s.index, s]));

        for (const step of trace.steps) {
            const baseStep = baseStepMap.get(step.index);
            if (baseStep) {
                if (baseStep.action !== step.action) {
                    contradictions.push(
                        `State divergence at step ${step.index}: Executed [${step.action}] but baseline expected [${baseStep.action}].`
                    );
                }
                if (baseStep.stateHash !== step.stateHash) {
                    contradictions.push(
                        `State hash mismatch at step ${step.index}: Got hash '${step.stateHash}' but baseline expects '${baseStep.stateHash}'.`
                    );
                }
            } else {
                contradictions.push(`Unplanned step ${step.index} [${step.action}] executed outside of baseline boundaries.`);
            }
        }

        return contradictions;
    }
}
