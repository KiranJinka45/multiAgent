import { TelemetryEvent } from './replay-compressor.js';

export interface CompressedNarrative {
    id: string;
    summary: string;
    incidentClass: string;
    timestamp: number;
    dominantEntropyScore: number;
    detailLayers: Map<number, TelemetryEvent[]>; // Maps a forensic depth level to the list of events
}

export class ReversibleCompressionEngine {
    /**
     * Condenses a sequence of telemetry events into a CompressedNarrative while preserving progressive detail layers.
     */
    public compressToNarrative(events: TelemetryEvent[], incidentClass: string): CompressedNarrative {
        const id = `narrative-${Math.random().toString(36).substring(2, 11)}`;
        const timestamp = events.length > 0 ? events[0].timestamp : Date.now();
        const maxEntropy = events.reduce((max, e) => Math.max(max, e.entropyScore), 0.0);
        
        // Progressive Layering:
        // Layer 0: Only extreme anomalies (entropyScore >= 0.8)
        // Layer 1: Mild anomalies (entropyScore >= 0.4)
        // Layer 2: All events (full diagnostic resolution)
        const layer0 = events.filter(e => e.entropyScore >= 0.8);
        const layer1 = events.filter(e => e.entropyScore >= 0.4);
        const layer2 = [...events];

        const detailLayers = new Map<number, TelemetryEvent[]>();
        detailLayers.set(0, layer0);
        detailLayers.set(1, layer1);
        detailLayers.set(2, layer2);

        const summary = `Compressed narrative for ${events.length} events of class '${incidentClass}'. Peak entropy: ${maxEntropy.toFixed(2)}. Layer 0 contains ${layer0.length} critical events.`;

        return {
            id,
            summary,
            incidentClass,
            timestamp,
            dominantEntropyScore: maxEntropy,
            detailLayers
        };
    }

    /**
     * Expands compressed narratives back to progressive detail levels for SRE inspection.
     * Level 0: Critical alerts only.
     * Level 1: Minor anomalies + critical alerts.
     * Level 2: Full raw telemetry.
     */
    public expandNarrative(narrative: CompressedNarrative, targetForensicLevel: number): TelemetryEvent[] {
        // Sort levels descending to find the highest matching level
        const levels = Array.from(narrative.detailLayers.keys()).sort((a, b) => b - a);
        
        let selectedLevel = 0;
        for (const lvl of levels) {
            if (lvl <= targetForensicLevel) {
                selectedLevel = lvl;
                break;
            }
        }

        const events = narrative.detailLayers.get(selectedLevel) || [];
        
        return events.map(e => ({
            ...e,
            payload: {
                ...e.payload,
                _restoredLevel: selectedLevel
            }
        }));
    }
}
