export interface SoakSample {
    timestamp: number;
    heapUsedBytes: number;
    replayEntropy: number;
    telemetryBytesIngested: number;
    businessTransactionsProcessed: number;
    alertCount: number;
    falsePositiveAlertCount: number;
    uncompressedBytes: number;
    compressedBytes: number;
}

export interface CampaignSummary {
    durationHours: number;
    heapSlopeBytesPerSec: number;
    isHeapLeaking: boolean;
    replayEntropyGrowthRate: number;
    averageTelemetryAmplificationRatio: number;
    storageInflationRateBytesPerSec: number;
    averageCompactionEfficiency: number;
    falsePositiveDriftSlope: number;
    operatorFatigueIndex: number; // calculated from alert count rate
}

export class MultiDaySoakCoordinator {
    private samples: SoakSample[] = [];
    private startTime: number;

    constructor() {
        this.startTime = Date.now();
    }

    /**
     * Records a new metric snapshot during the long-horizon campaign.
     */
    public recordSample(sample: SoakSample): void {
        this.samples.push(sample);
    }

    /**
     * Resets campaign metrics.
     */
    public resetCampaign(): void {
        this.samples = [];
        this.startTime = Date.now();
    }

    /**
     * Compiles sample arrays to calculate regression slopes, efficiencies, and fatigue curves.
     */
    public getCampaignSummary(): CampaignSummary | null {
        if (this.samples.length < 2) {
            return null;
        }

        const firstSample = this.samples[0];
        const lastSample = this.samples[this.samples.length - 1];
        const durationMs = lastSample.timestamp - firstSample.timestamp;
        const durationHours = durationMs / (1000 * 60 * 60);

        // 1. Calculate linear regression slope for heap size (bytes/sec)
        const heapSlopeBytesPerSec = this.calculateLinearSlope(
            this.samples.map(s => (s.timestamp - firstSample.timestamp) / 1000),
            this.samples.map(s => s.heapUsedBytes)
        );

        // 2. Replay entropy growth rate (total entropy delta / hour)
        const totalEntropyDelta = lastSample.replayEntropy - firstSample.replayEntropy;
        const replayEntropyGrowthRate = durationHours > 0 ? totalEntropyDelta / durationHours : 0;

        // 3. Telemetry amplification ratio: bytes ingested / business transaction
        let totalTelemetryBytes = 0;
        let totalTransactions = 0;
        for (const s of this.samples) {
            totalTelemetryBytes += s.telemetryBytesIngested;
            totalTransactions += s.businessTransactionsProcessed;
        }
        const averageTelemetryAmplificationRatio = totalTransactions > 0 
            ? totalTelemetryBytes / totalTransactions 
            : 0;

        // 4. Storage inflation rate (uncompressed bytes / sec)
        const storageInflationRateBytesPerSec = this.calculateLinearSlope(
            this.samples.map(s => (s.timestamp - firstSample.timestamp) / 1000),
            this.samples.map(s => s.uncompressedBytes)
        );

        // 5. Average compaction efficiency: (1 - compressed/uncompressed)
        let compactionSum = 0;
        let validCompactionSamples = 0;
        for (const s of this.samples) {
            if (s.uncompressedBytes > 0) {
                compactionSum += (1.0 - (s.compressedBytes / s.uncompressedBytes));
                validCompactionSamples++;
            }
        }
        const averageCompactionEfficiency = validCompactionSamples > 0 
            ? compactionSum / validCompactionSamples 
            : 0;

        // 6. False positive alert drift slope (false positive count / hour)
        const falsePositiveDriftSlope = this.calculateLinearSlope(
            this.samples.map(s => (s.timestamp - firstSample.timestamp) / (1000 * 60 * 60)),
            this.samples.map(s => s.falsePositiveAlertCount)
        );

        // 7. Operator fatigue index: total alerts per hour
        let totalAlerts = 0;
        for (const s of this.samples) {
            totalAlerts += s.alertCount;
        }
        const operatorFatigueIndex = durationHours > 0 ? totalAlerts / durationHours : 0;

        return {
            durationHours: Math.round(durationHours * 100) / 100,
            heapSlopeBytesPerSec,
            isHeapLeaking: heapSlopeBytesPerSec > 10, // leakage thresh: > 10 bytes/sec steady
            replayEntropyGrowthRate: Math.round(replayEntropyGrowthRate * 100) / 100,
            averageTelemetryAmplificationRatio: Math.round(averageTelemetryAmplificationRatio * 100) / 100,
            storageInflationRateBytesPerSec,
            averageCompactionEfficiency: Math.round(averageCompactionEfficiency * 10000) / 10000,
            falsePositiveDriftSlope: Math.round(falsePositiveDriftSlope * 100) / 100,
            operatorFatigueIndex: Math.round(operatorFatigueIndex * 100) / 100
        };
    }

    /**
     * Standard least-squares linear regression slope calculator.
     */
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
