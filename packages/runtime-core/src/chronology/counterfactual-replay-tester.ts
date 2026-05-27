import { TelemetryEvent } from './replay-compressor.js';

export interface CounterfactualTestResult {
    fieldToPrune: string;
    originalEventCount: number;
    remainingEventCount: number;
    isSafeToPrune: boolean;
    replayCertainty: number; // 0.0 to 1.0
    warnings: string[];
}

export class CounterfactualReplayTester {
    private readonly criticalKeywords = ['lease', 'acquire', 'fail', 'corrupt', 'diverge', 'promotion', 'restart', 'shutdown', 'panic'];

    /**
     * Simulates the pruning of a telemetry field/event-type and evaluates
     * if the timeline remains causally reconstructible and certifiable.
     */
    public testCounterfactualPruning(
        events: TelemetryEvent[],
        fieldToPrune: string
    ): CounterfactualTestResult {
        if (events.length === 0) {
            return {
                fieldToPrune,
                originalEventCount: 0,
                remainingEventCount: 0,
                isSafeToPrune: true,
                replayCertainty: 1.0,
                warnings: []
            };
        }

        const lowerField = fieldToPrune.toLowerCase();
        
        // Filter events that contain the target field in type or payload keys
        const remainingEvents = events.filter(event => {
            const typeMatches = event.type.toLowerCase().includes(lowerField);
            const payloadKeysMatch = Object.keys(event.payload || {}).some(k => 
                k.toLowerCase().includes(lowerField)
            );
            return !(typeMatches || payloadKeysMatch);
        });

        const prunedEvents = events.filter(e => !remainingEvents.some(re => re.id === e.id));

        let replayCertainty = 1.0;
        const warnings: string[] = [];

        // Check if we lost boundary markers
        const originalFirst = events[0];
        const originalLast = events[events.length - 1];

        const lostFirst = prunedEvents.some(e => e.id === originalFirst.id);
        const lostLast = prunedEvents.some(e => e.id === originalLast.id);

        if (lostFirst || lostLast) {
            replayCertainty -= 0.35;
            warnings.push('Telemetry pruning removes sequence boundaries, violating timeline integrity.');
        }

        // Check if we pruned high-entropy anomalies
        const prunedAnomalies = prunedEvents.filter(e => e.entropyScore >= 0.50);
        if (prunedAnomalies.length > 0) {
            replayCertainty -= 0.40 * prunedAnomalies.length;
            warnings.push(`Telemetry pruning discards ${prunedAnomalies.length} high-entropy anomaly events.`);
        }

        // Check if we pruned critical transitions
        const prunedCriticals = prunedEvents.filter(event => {
            const typeLower = event.type.toLowerCase();
            const payloadStr = JSON.stringify(event.payload || '').toLowerCase();
            return this.criticalKeywords.some(keyword => 
                typeLower.includes(keyword) || payloadStr.includes(keyword)
            );
        });

        if (prunedCriticals.length > 0) {
            replayCertainty -= 0.20 * prunedCriticals.length;
            warnings.push(`Telemetry pruning discards ${prunedCriticals.length} critical state-machine transition events.`);
        }

        // Bound certainty between 0.0 and 1.0
        replayCertainty = Math.max(0.0, Math.min(1.0, Math.round(replayCertainty * 100) / 100));
        const isSafeToPrune = replayCertainty >= 0.70;

        return {
            fieldToPrune,
            originalEventCount: events.length,
            remainingEventCount: remainingEvents.length,
            isSafeToPrune,
            replayCertainty,
            warnings
        };
    }
}
