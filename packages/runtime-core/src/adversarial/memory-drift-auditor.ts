/**
 * ─── ZTAN Memory Drift & Fragmentation Auditor ────────────────────────────────
 * Periodically records process memory usage profiles and audits long-horizon
 * heap growth slopes to detect slow leaks, GC fragmentation, and cgroup limits.
 * ────────────────────────────────────────────────────────────────────────────
 */
export interface MemorySnapshot {
    timestamp: Date;
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
}

export class MemoryDriftAuditor {
    private snapshots: MemorySnapshot[] = [];
    private maxSnapshots = 5000;

    /**
     * Record a process memory snapshot
     */
    public recordSnapshot(): MemorySnapshot {
        const mem = process.memoryUsage();
        const snapshot: MemorySnapshot = {
            timestamp: new Date(),
            heapUsed: mem.heapUsed,
            heapTotal: mem.heapTotal,
            external: mem.external,
            rss: mem.rss
        };

        this.snapshots.push(snapshot);
        if (this.snapshots.length > this.maxSnapshots) {
            this.snapshots.shift(); // Evict oldest
        }

        return snapshot;
    }

    /**
     * Calculates the memory growth rate slope in bytes per minute
     */
    public calculateGrowthRatePerMinute(): number {
        if (this.snapshots.length < 2) return 0;

        const first = this.snapshots[0];
        const last = this.snapshots[this.snapshots.length - 1];
        const elapsedMinutes = (last.timestamp.getTime() - first.timestamp.getTime()) / 60000;

        if (elapsedMinutes === 0) return 0;
        const growthBytes = last.heapUsed - first.heapUsed;
        return parseFloat((growthBytes / elapsedMinutes).toFixed(2));
    }

    /**
     * Audits heap fragmentation and leak thresholds
     */
    public auditDriftThresholds(maxAllowedSlopeBytesPerMin = 1024 * 1024): { breached: boolean; reason?: string } {
        const slope = this.calculateGrowthRatePerMinute();
        if (slope > maxAllowedSlopeBytesPerMin) {
            return {
                breached: true,
                reason: `MEMORY_DRIFT_DETECTED: Heap usage is growing at ${slope.toFixed(2)} bytes/min, exceeding the limit of ${maxAllowedSlopeBytesPerMin} bytes/min.`
            };
        }

        // Check if heap fragmentation exceeds 85%
        const latest = this.snapshots[this.snapshots.length - 1];
        if (latest && latest.heapTotal > 0) {
            const fragmentationRatio = latest.heapUsed / latest.heapTotal;
            if (fragmentationRatio > 0.85 && latest.heapTotal > 128 * 1024 * 1024) {
                return {
                    breached: true,
                    reason: `HIGH_GC_FRAGMENTATION: V8 active heap utilization is ${ (fragmentationRatio * 100).toFixed(1) }%, indicating potential GC compaction failure.`
                };
            }
        }

        return { breached: false };
    }

    /**
     * Retrieve all logged memory history
     */
    public getHistory(): MemorySnapshot[] {
        return this.snapshots;
    }
}
