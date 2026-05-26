import { PerformanceObserver } from 'perf_hooks';

/**
 * ─── ZTAN V8 GC & Loop Lag Telemetry Recorder ───────────────────────────────
 * Monitors native V8 heap usage slopes, registers PerformanceObserver sweeps
 * for GC latency metrics, and maintains event-loop delay histograms.
 * ────────────────────────────────────────────────────────────────────────────
 */

export class GcTelemetryRecorder {
    private heapSnapshots: { timestamp: Date; heapUsed: number; heapTotal: number; external: number }[] = [];
    private gcPauses: { timestamp: Date; durationMs: number; entryType: string }[] = [];
    private eventLoopLags: number[] = [];
    private lastTime = Date.now();
    private lagInterval: NodeJS.Timeout | null = null;
    private observer: PerformanceObserver | null = null;

    public start() {
        this.lastTime = Date.now();
        // Check event-loop delay every 100ms
        this.lagInterval = setInterval(() => {
            const now = Date.now();
            const expectedDelay = 100;
            const lag = now - this.lastTime - expectedDelay;
            this.eventLoopLags.push(Math.max(0, lag));
            this.lastTime = now;
            
            // Record heap statistics
            const mem = process.memoryUsage();
            this.heapSnapshots.push({
                timestamp: new Date(),
                heapUsed: mem.heapUsed,
                heapTotal: mem.heapTotal,
                external: mem.external
            });
        }, 100);

        // Register observer for native V8 GC latency duration
        try {
            this.observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                for (const entry of entries) {
                    this.gcPauses.push({
                        timestamp: new Date(),
                        durationMs: entry.duration,
                        entryType: entry.name
                    });
                }
            });
            this.observer.observe({ entryTypes: ['gc'] });
        } catch (e) {
            // Observer not supported or fails gracefully in restricted sandboxes
        }
    }

    public stop() {
        if (this.lagInterval) {
            clearInterval(this.lagInterval);
        }
        if (this.observer) {
            this.observer.disconnect();
        }
    }

    public getStats() {
        const avgLag = this.eventLoopLags.length > 0 
            ? this.eventLoopLags.reduce((a, b) => a + b, 0) / this.eventLoopLags.length 
            : 0;
        const maxLag = this.eventLoopLags.length > 0 
            ? Math.max(...this.eventLoopLags) 
            : 0;
        const peakGcPause = this.gcPauses.length > 0 
            ? Math.max(...this.gcPauses.map(p => p.durationMs)) 
            : 0;

        return {
            averageLoopLagMs: parseFloat(avgLag.toFixed(2)),
            maxLoopLagMs: maxLag,
            peakGcPauseMs: parseFloat(peakGcPause.toFixed(2)),
            gcPauseEventsCount: this.gcPauses.length,
            heapSnapshotsCount: this.heapSnapshots.length,
            latestHeapUsedBytes: this.heapSnapshots[this.heapSnapshots.length - 1]?.heapUsed || 0,
            heapGrowthSlopeBytes: this.calculateHeapGrowthSlope()
        };
    }

    private calculateHeapGrowthSlope(): number {
        if (this.heapSnapshots.length < 2) return 0;
        const first = this.heapSnapshots[0].heapUsed;
        const last = this.heapSnapshots[this.heapSnapshots.length - 1].heapUsed;
        return last - first;
    }
}
