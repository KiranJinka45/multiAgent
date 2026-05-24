import type { ImmutableEventStore } from './event-store.js';
import type { ReplayReducer } from './reducer.js';
import { StateConvergenceEngine } from './reducer.js';

export interface PerformanceTelemetry {
    replayDurationMs: number;
    eventsProcessed: number;
    throughputEventsPerSec: number;
    snapshotLatencyMs: number;
}

export class ReplayPerformanceTracker {
    public static measureReplay<S, E>(
        initialState: S,
        store: ImmutableEventStore<E>,
        reducer: ReplayReducer<S, E>
    ): PerformanceTelemetry {
        const start = performance.now();
        const engine = new StateConvergenceEngine(initialState, reducer, 999999);
        const blocks = store.getBlocks();

        for (const block of blocks) {
            engine.transition(block.payload);
        }

        const duration = performance.now() - start;
        const throughput = duration > 0 ? (blocks.length / (duration / 1000)) : blocks.length * 1000;

        return {
            replayDurationMs: Number(duration.toFixed(3)),
            eventsProcessed: blocks.length,
            throughputEventsPerSec: Number(throughput.toFixed(2)),
            snapshotLatencyMs: 0 // Measured separately
        };
    }
}
