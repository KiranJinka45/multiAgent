import { TelemetryEvent } from './replay-compressor.js';

export class ReplayMinimalist {
    private readonly criticalKeywords = ['lease', 'acquire', 'fail', 'corrupt', 'diverge', 'promotion', 'restart', 'shutdown', 'panic'];

    /**
     * Reduces a telemetry event stream to its Minimum Viable Forensic Surface (MVFS).
     * Keeps boundary events, high-entropy anomaly spikes, and critical state-transition triggers,
     * while discarding redundant heartbeat/polling loops.
     */
    public computeMinimumViableForensicSurface(events: TelemetryEvent[]): TelemetryEvent[] {
        if (events.length <= 2) return [...events];

        const mvfs: TelemetryEvent[] = [];
        
        // Always retain boundary markers
        const firstEvent = events[0];
        const lastEvent = events[events.length - 1];

        mvfs.push(firstEvent);

        for (let i = 1; i < events.length - 1; i++) {
            const event = events[i];

            // Retain if high-entropy anomaly
            if (event.entropyScore >= 0.50) {
                mvfs.push(event);
                continue;
            }

            // Retain if it matches critical state-machine actions
            const typeLower = event.type.toLowerCase();
            const payloadStr = JSON.stringify(event.payload || '').toLowerCase();
            const isCriticalAction = this.criticalKeywords.some(keyword => 
                typeLower.includes(keyword) || payloadStr.includes(keyword)
            );

            if (isCriticalAction) {
                mvfs.push(event);
            }
        }

        // Add last boundary marker if not already added
        if (!mvfs.some(e => e.id === lastEvent.id)) {
            mvfs.push(lastEvent);
        }

        // Sort by timestamp to maintain chronological integrity
        return mvfs.sort((a, b) => a.timestamp - b.timestamp);
    }
}
