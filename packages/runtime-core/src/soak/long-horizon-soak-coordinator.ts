export interface CapacityProjections {
    heapSlopeBytesPerSec: number;
    heapExhaustionDays: number | null; // days until memory exhaustion
    storageGrowthBytesPerSec: number;
    storageExhaustionDays: number | null; // days until storage limits reached
}

export interface AgingTierAllocation {
    tierName: string;
    retentionDaysMin: number;
    retentionDaysMax: number;
    allocationPercent: number;
    sizeBytes: number;
    monthlyCostUsd: number;
}

export class LongHorizonSoakCoordinator {
    private timestamps: number[] = [];
    private heapBytes: number[] = [];
    private dbStorageBytes: number[] = [];

    // AWS pricing constants for tier allocation
    private readonly tierRates: Record<string, number> = {
        'S3_STANDARD': 0.023,
        'S3_STANDARD_IA': 0.0125,
        'S3_GLACIER_DEEP': 0.00099
    };

    /**
     * Records telemetry coordinates for the long soak campaign.
     */
    public recordDataPoint(timestamp: number, heapUsed: number, dbStorage: number): void {
        this.timestamps.push(timestamp);
        this.heapBytes.push(heapUsed);
        this.dbStorageBytes.push(dbStorage);
    }

    /**
     * Resets historical tracking coordinates.
     */
    public resetCoordinates(): void {
        this.timestamps = [];
        this.heapBytes = [];
        this.dbStorageBytes = [];
    }

    /**
     * Uses least-squares regression to project exact exhaustion dates for memory heap and disk storage.
     */
    public projectCapacityExhaustion(
        maxMemoryLimitBytes: number,
        maxDiskLimitBytes: number
    ): CapacityProjections | null {
        if (this.timestamps.length < 2) return null;

        const firstTime = this.timestamps[0];
        const relativeTimesSec = this.timestamps.map(t => (t - firstTime) / 1000);

        // Calculate slopes (bytes/sec)
        const heapSlope = this.calculateLinearSlope(relativeTimesSec, this.heapBytes);
        const storageSlope = this.calculateLinearSlope(relativeTimesSec, this.dbStorageBytes);

        // Project days to reach limit
        const latestHeap = this.heapBytes[this.heapBytes.length - 1];
        const latestStorage = this.dbStorageBytes[this.dbStorageBytes.length - 1];

        let heapExhaustionDays: number | null = null;
        if (heapSlope > 0) {
            const bytesToHeapLimit = maxMemoryLimitBytes - latestHeap;
            const secondsToLimit = bytesToHeapLimit / heapSlope;
            heapExhaustionDays = Math.round((secondsToLimit / (24 * 60 * 60)) * 100) / 100;
        }

        let storageExhaustionDays: number | null = null;
        if (storageSlope > 0) {
            const bytesToStorageLimit = maxDiskLimitBytes - latestStorage;
            const secondsToLimit = bytesToStorageLimit / storageSlope;
            storageExhaustionDays = Math.round((secondsToLimit / (24 * 60 * 60)) * 100) / 100;
        }

        return {
            heapSlopeBytesPerSec: Math.round(heapSlope * 100) / 100,
            heapExhaustionDays,
            storageGrowthBytesPerSec: Math.round(storageSlope * 100) / 100,
            storageExhaustionDays
        };
    }

    /**
     * Models evidence aging curves across Standard, Infrequent Access (IA), and Glacier Deep tiers.
     */
    public calculateStorageAgingTiers(totalStorageBytes: number): AgingTierAllocation[] {
        // Standard Curve:
        // - Standard (Age 0-30 days): 20% size
        // - Standard IA (Age 31-90 days): 30% size
        // - Glacier Deep Archive (Age 91-365+ days): 50% size
        const allocations = [
            { name: 'S3_STANDARD', minDays: 0, maxDays: 30, percent: 0.20 },
            { name: 'S3_STANDARD_IA', minDays: 31, maxDays: 90, percent: 0.30 },
            { name: 'S3_GLACIER_DEEP', minDays: 91, maxDays: 365, percent: 0.50 }
        ];

        return allocations.map(alloc => {
            const sizeBytes = totalStorageBytes * alloc.percent;
            const sizeGb = sizeBytes / (1024 * 1024 * 1024);
            const rate = this.tierRates[alloc.name] || 0.023;
            const monthlyCostUsd = Math.round((sizeGb * rate) * 100) / 100;

            return {
                tierName: alloc.name,
                retentionDaysMin: alloc.minDays,
                retentionDaysMax: alloc.maxDays,
                allocationPercent: alloc.percent,
                sizeBytes,
                monthlyCostUsd
            };
        });
    }

    private calculateLinearSlope(x: number[], y: number[]): number {
        const n = x.length;
        if (n < 2) return 0;

        let sumX = 0;
        let sumY = 0;
        let sumXY = 0;
        let sumXX = 0;

        for (let i = 0; i < n; i++) {
            sumX += x[i];
            sumY += y[i];
            sumXY += x[i] * y[i];
            sumXX += x[i] * x[i];
        }

        const num = (n * sumXY) - (sumX * sumY);
        const den = (n * sumXX) - (sumX * sumX);

        if (den === 0) return 0;
        return num / den;
    }
}
