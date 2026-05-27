export interface TelemetryEvent {
    id: string;
    type: string;
    timestamp: number;
    entropyScore: number; // 0.0 to 1.0 (anomalous scale)
    payload: Record<string, any>;
}

export interface CausalGraph {
    nodes: Array<{ id: string; type: string; importance: number }>;
    edges: Array<{ from: string; to: string; relationship: string }>;
}

export interface CompressedGraph {
    nodes: Array<{ id: string; type: string; importance: number }>;
    edges: Array<{ from: string; to: string; relationship: string }>;
    prunedNodeCount: number;
}

export interface ReplayTrace {
    traceId: string;
    steps: Array<{ index: number; action: string; stateHash: string; timestamp: number }>;
}

export interface DeltaEncodedTrace {
    traceId: string;
    baseTraceId: string | null;
    addedSteps: Array<{ index: number; action: string; stateHash: string; timestamp: number }>;
    removedStepIndices: number[];
}

export interface Timeline {
    events: TelemetryEvent[];
}

export interface CondensedTimeline {
    segments: Array<{
        startTime: number;
        endTime: number;
        eventType: string;
        eventCount: number;
        dominantEntropyScore: number;
    }>;
}

export class ReplayCompressor {
    /**
     * Prunes causality graph nodes whose importance score falls below a threshold (default 0.30).
     * Connective integrity is maintained by filtering edges.
     */
    public compressCausalityGraph(graph: CausalGraph, minImportance: number = 0.3): CompressedGraph {
        const keptNodes = graph.nodes.filter(node => node.importance >= minImportance);
        const keptNodeIds = new Set(keptNodes.map(n => n.id));

        const keptEdges = graph.edges.filter(edge => 
            keptNodeIds.has(edge.from) && keptNodeIds.has(edge.to)
        );

        return {
            nodes: keptNodes,
            edges: keptEdges,
            prunedNodeCount: graph.nodes.length - keptNodes.length
        };
    }

    /**
     * Deduplicates consecutive redundant events (e.g. heartbeat loops)
     * while preserving first, last, and high-entropy spikes in the sequence.
     */
    public semanticDeduplication(events: TelemetryEvent[]): TelemetryEvent[] {
        if (events.length <= 2) return [...events];

        const result: TelemetryEvent[] = [];
        let runType = events[0].type;
        let runStartIdx = 0;

        const flushRun = (endIdx: number) => {
            result.push(events[runStartIdx]); // Keep first
            
            // Look for any high-entropy anomaly spikes within the run
            for (let i = runStartIdx + 1; i < endIdx; i++) {
                if (events[i].entropyScore >= 0.7) {
                    result.push(events[i]);
                }
            }

            if (endIdx > runStartIdx) {
                result.push(events[endIdx]); // Keep last
            }
        };

        for (let i = 1; i < events.length; i++) {
            if (events[i].type !== runType) {
                flushRun(i - 1);
                runType = events[i].type;
                runStartIdx = i;
            }
        }
        flushRun(events.length - 1);

        return result;
    }

    /**
     * Enforces anomaly-first storage by discarding regular metrics (low entropy) and retaining anomaly spikes.
     */
    public anomalyFirstRetention(events: TelemetryEvent[], scoreThreshold: number = 0.3): TelemetryEvent[] {
        return events.filter(event => event.entropyScore >= scoreThreshold);
    }

    /**
     * Encodes subsequent execution traces as diffs/deltas relative to a base trace.
     */
    public replayDeltaEncoding(traces: ReplayTrace[]): DeltaEncodedTrace[] {
        if (traces.length === 0) return [];

        const encoded: DeltaEncodedTrace[] = [];
        const base = traces[0];

        // First trace acts as full baseline
        encoded.push({
            traceId: base.traceId,
            baseTraceId: null,
            addedSteps: base.steps,
            removedStepIndices: []
        });

        for (let i = 1; i < traces.length; i++) {
            const current = traces[i];
            const addedSteps: DeltaEncodedTrace['addedSteps'] = [];
            const removedStepIndices: number[] = [];

            // Simple diff: match step index actions and hashes
            const maxLen = Math.max(base.steps.length, current.steps.length);
            for (let j = 0; j < maxLen; j++) {
                const baseStep = base.steps[j];
                const curStep = current.steps[j];

                if (baseStep && curStep) {
                    if (baseStep.action !== curStep.action || baseStep.stateHash !== curStep.stateHash) {
                        // Conflict/Difference: treat as added replacement
                        addedSteps.push(curStep);
                    }
                } else if (curStep) {
                    // Added step
                    addedSteps.push(curStep);
                } else if (baseStep) {
                    // Removed step
                    removedStepIndices.push(baseStep.index);
                }
            }

            encoded.push({
                traceId: current.traceId,
                baseTraceId: base.traceId,
                addedSteps,
                removedStepIndices
            });
        }

        return encoded;
    }

    /**
     * Condenses timeline intervals (e.g. 5-minute segments) to prevent SRE cognitive fatigue.
     */
    public timelineCondensation(timeline: Timeline, intervalMs: number = 300000): CondensedTimeline {
        if (timeline.events.length === 0) return { segments: [] };

        const sorted = [...timeline.events].sort((a, b) => a.timestamp - b.timestamp);
        const segments: CondensedTimeline['segments'] = [];

        let currentSegment: {
            startTime: number;
            endTime: number;
            eventType: string;
            eventCount: number;
            maxEntropy: number;
        } | null = null;

        for (const event of sorted) {
            const bucketStart = Math.floor(event.timestamp / intervalMs) * intervalMs;

            if (currentSegment && currentSegment.startTime === bucketStart && currentSegment.eventType === event.type) {
                currentSegment.eventCount++;
                currentSegment.endTime = event.timestamp;
                if (event.entropyScore > currentSegment.maxEntropy) {
                    currentSegment.maxEntropy = event.entropyScore;
                }
            } else {
                if (currentSegment) {
                    segments.push({
                        startTime: currentSegment.startTime,
                        endTime: currentSegment.endTime,
                        eventType: currentSegment.eventType,
                        eventCount: currentSegment.eventCount,
                        dominantEntropyScore: currentSegment.maxEntropy
                    });
                }
                currentSegment = {
                    startTime: bucketStart,
                    endTime: event.timestamp,
                    eventType: event.type,
                    eventCount: 1,
                    maxEntropy: event.entropyScore
                };
            }
        }

        if (currentSegment) {
            segments.push({
                startTime: currentSegment.startTime,
                endTime: currentSegment.endTime,
                eventType: currentSegment.eventType,
                eventCount: currentSegment.eventCount,
                dominantEntropyScore: currentSegment.maxEntropy
            });
        }

        return { segments };
    }
}
