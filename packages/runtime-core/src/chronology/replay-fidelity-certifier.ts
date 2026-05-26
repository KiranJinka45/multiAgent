import { TelemetryEvent } from './replay-compressor.js';

export interface FidelityReport {
    isCertified: boolean;
    fidelityScore: number; // 0.0 to 1.0
    retainedAnomalyDetectability: number;
    retainedCausalReconstructability: number;
    retainedReplayEquivalenceConfidence: number;
    warnings: string[];
}

export class ReplayFidelityCertifier {
    private readonly certificationThreshold = 0.85;

    /**
     * Certifies if compressed/deduplicated telemetry maintains forensic integrity.
     */
    public certifyFidelity(original: TelemetryEvent[], compressed: TelemetryEvent[]): FidelityReport {
        const warnings: string[] = [];

        // 1. Calculate Anomaly Detectability
        // Check if all events with entropy >= 0.5 are preserved in the compressed set
        const originalAnomalies = original.filter(e => e.entropyScore >= 0.5);
        let retainedAnomalyDetectability = 1.0;

        if (originalAnomalies.length > 0) {
            const compressedIds = new Set(compressed.map(e => e.id));
            const foundCount = originalAnomalies.filter(e => compressedIds.has(e.id)).length;
            retainedAnomalyDetectability = foundCount / originalAnomalies.length;
        }

        if (retainedAnomalyDetectability < 1.0) {
            warnings.push(`Pruned ${originalAnomalies.length - Math.round(retainedAnomalyDetectability * originalAnomalies.length)} critical high-entropy anomalies from the archive.`);
        }

        // 2. Calculate Causal Reconstructability
        // Check if the relative chronological order of important events (entropy >= 0.3) is preserved
        const originalImportant = original.filter(e => e.entropyScore >= 0.3).sort((a, b) => a.timestamp - b.timestamp);
        const compressedImportant = compressed.filter(e => e.entropyScore >= 0.3).sort((a, b) => a.timestamp - b.timestamp);
        let retainedCausalReconstructability = 1.0;

        if (originalImportant.length > 1) {
            const originalPairs: string[] = [];
            for (let i = 0; i < originalImportant.length - 1; i++) {
                originalPairs.push(`${originalImportant[i].id}->${originalImportant[i + 1].id}`);
            }

            const compIds = compressedImportant.map(e => e.id);
            let preservedPairs = 0;
            for (const pair of originalPairs) {
                const [first, second] = pair.split('->');
                const firstIdx = compIds.indexOf(first);
                const secondIdx = compIds.indexOf(second);
                // Check if both exist and first is before second
                if (firstIdx !== -1 && secondIdx !== -1 && firstIdx < secondIdx) {
                    preservedPairs++;
                }
            }
            retainedCausalReconstructability = preservedPairs / originalPairs.length;
        }

        if (retainedCausalReconstructability < 0.9) {
            warnings.push(`Causal dependency chain order degraded. Reconstruction confidence at ${(retainedCausalReconstructability * 100).toFixed(0)}%.`);
        }

        // 3. Calculate State Equivalence Confidence
        // Verify that initial, final, and key state transitions match
        let retainedReplayEquivalenceConfidence = 1.0;
        if (original.length > 0 && compressed.length > 0) {
            const origFirst = original[0];
            const origLast = original[original.length - 1];
            const compFirst = compressed[0];
            const compLast = compressed[compressed.length - 1];

            let score = 0;
            if (origFirst.id === compFirst.id) score += 0.5;
            if (origLast.id === compLast.id) score += 0.5;

            retainedReplayEquivalenceConfidence = score;
        }

        if (retainedReplayEquivalenceConfidence < 1.0) {
            warnings.push('Telemetry boundary nodes mismatch. Replay trace state equivalence degraded.');
        }

        // Composite Fidelity Score
        const fidelityScore = Math.round(
            ((retainedAnomalyDetectability * 0.40) + 
             (retainedCausalReconstructability * 0.40) + 
             (retainedReplayEquivalenceConfidence * 0.20)) * 100
        ) / 100;

        const isCertified = fidelityScore >= this.certificationThreshold;

        return {
            isCertified,
            fidelityScore,
            retainedAnomalyDetectability: Math.round(retainedAnomalyDetectability * 100) / 100,
            retainedCausalReconstructability: Math.round(retainedCausalReconstructability * 100) / 100,
            retainedReplayEquivalenceConfidence: Math.round(retainedReplayEquivalenceConfidence * 100) / 100,
            warnings
        };
    }
}
