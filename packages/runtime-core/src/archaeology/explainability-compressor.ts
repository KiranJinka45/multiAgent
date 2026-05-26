import { Hypothesis } from './probabilistic-explainability.js';

export interface CompressedExplanation {
    dominantCause: string;
    dominantProbability: number;
    competingHypotheses: Array<{ label: string; probability: number }>;
    cognitiveSummary: string;
    uncertaintyLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export class ExplainabilityCompressor {
    /**
     * Consolidates competing hypotheses from different engines/diagnostics
     * into a single compressed view while preserving alternative paths.
     */
    public compressExplanation(hypotheses: Hypothesis[]): CompressedExplanation {
        if (hypotheses.length === 0) {
            return {
                dominantCause: 'UNKNOWN',
                dominantProbability: 0.0,
                competingHypotheses: [],
                cognitiveSummary: 'No diagnostic hypotheses available.',
                uncertaintyLevel: 'HIGH'
            };
        }

        // 1. Group hypotheses by label and average their probabilities
        const groups = new Map<string, { sumProb: number; count: number; evidence: Set<string> }>();
        
        for (const h of hypotheses) {
            const current = groups.get(h.label) || { sumProb: 0, count: 0, evidence: new Set<string>() };
            current.sumProb += h.probability;
            current.count++;
            if (h.supportingEvidence) {
                h.supportingEvidence.forEach(e => current.evidence.add(e));
            }
            groups.set(h.label, current);
        }

        // 2. Build normalized aggregated hypotheses list
        let aggregated: Array<{ label: string; probability: number; evidence: string[] }> = [];
        let totalSum = 0;

        for (const [label, data] of groups.entries()) {
            const avgProb = data.sumProb / data.count;
            totalSum += avgProb;
            aggregated.push({
                label,
                probability: avgProb,
                evidence: Array.from(data.evidence)
            });
        }

        // Normalize probabilities to sum to exactly 1.0
        if (totalSum > 0) {
            aggregated = aggregated.map(a => ({
                ...a,
                probability: Math.round((a.probability / totalSum) * 100) / 100
            }));
        }

        // Sort descending by probability
        aggregated.sort((a, b) => b.probability - a.probability);

        // Adjust rounding errors
        const sum = aggregated.reduce((acc, a) => acc + a.probability, 0);
        if (sum !== 1.0 && aggregated.length > 0) {
            aggregated[0].probability = Math.round((aggregated[0].probability + (1.0 - sum)) * 100) / 100;
        }

        // Sort again in case adjustment shifted order (unlikely but safe)
        aggregated.sort((a, b) => b.probability - a.probability);

        // 3. Evaluate dominant cause and competing list
        const dominant = aggregated[0];
        const competingHypotheses = aggregated.slice(1).map(a => ({
            label: a.label,
            probability: a.probability
        }));

        // 4. Determine Uncertainty Level
        let uncertaintyLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
        const runnerUp = competingHypotheses[0];

        if (dominant.probability >= 0.75) {
            uncertaintyLevel = 'LOW';
        } else if (dominant.probability < 0.50 || (runnerUp && (dominant.probability - runnerUp.probability) <= 0.08)) {
            // Highly uncertain if dominant is < 50% or if runner-up is within 8% of the dominant
            uncertaintyLevel = 'HIGH';
        }

        // 5. Construct Cognitive Summary preserving alternative root causes
        let cognitiveSummary = `Primary cause: ${dominant.label} (${(dominant.probability * 100).toFixed(0)}%).`;
        
        // If runner up is close (within 20% of the dominant), explicitly list it to preserve uncertainty
        if (runnerUp && (dominant.probability - runnerUp.probability) <= 0.20) {
            cognitiveSummary += ` WARNING: Competing root-cause alternative detected: ${runnerUp.label} (${(runnerUp.probability * 100).toFixed(0)}%). Investigate both branches to prevent false convergence bias.`;
        }

        return {
            dominantCause: dominant.label,
            dominantProbability: dominant.probability,
            competingHypotheses,
            cognitiveSummary,
            uncertaintyLevel
        };
    }
}
