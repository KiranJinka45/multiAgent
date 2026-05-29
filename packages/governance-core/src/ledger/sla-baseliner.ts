export interface ExecutionTiming {
    operationId: string;
    latencyMs: number;
    overheadMs: number; // Governance-induced overhead
    anomalyDetected: boolean;
    timeToDetectMs?: number; // How long it took to detect anomaly
}

export interface SlaBaselineReport {
    totalSamples: number;
    latencies: {
        mean: number;
        p50: number;
        p95: number;
        p99: number;
    };
    overhead: {
        meanPercentage: number;
    };
    security: {
        totalAnomalies: number;
        meanTimeToDetectMs: number;
    };
    slaSafetyBoundaryMs: number; // The computed safe timeout for governance
}

export class SlaBaseliner {
    static compute(timings: ExecutionTiming[]): SlaBaselineReport {
        if (timings.length === 0) {
            throw new Error("Cannot compute SLA on empty timings array");
        }

        const sortedLatencies = [...timings].sort((a, b) => a.latencyMs - b.latencyMs);
        
        let totalLatency = 0;
        let totalOverheadPercentage = 0;
        
        let anomalies = 0;
        let totalMttd = 0;

        for (const t of sortedLatencies) {
            totalLatency += t.latencyMs;
            
            const baseTime = t.latencyMs - t.overheadMs;
            const overheadPct = baseTime > 0 ? (t.overheadMs / baseTime) * 100 : 0;
            totalOverheadPercentage += overheadPct;

            if (t.anomalyDetected && t.timeToDetectMs !== undefined) {
                anomalies++;
                totalMttd += t.timeToDetectMs;
            }
        }

        const getPercentile = (p: number) => {
            const index = Math.ceil((p / 100) * sortedLatencies.length) - 1;
            return sortedLatencies[Math.max(0, index)].latencyMs;
        };

        const p99 = getPercentile(99);

        // Safe SLA boundary is the P99 + 50% buffer to account for adversarial jitter
        const slaSafetyBoundaryMs = p99 * 1.5;

        return {
            totalSamples: timings.length,
            latencies: {
                mean: totalLatency / timings.length,
                p50: getPercentile(50),
                p95: getPercentile(95),
                p99: p99,
            },
            overhead: {
                meanPercentage: totalOverheadPercentage / timings.length,
            },
            security: {
                totalAnomalies: anomalies,
                meanTimeToDetectMs: anomalies > 0 ? totalMttd / anomalies : 0,
            },
            slaSafetyBoundaryMs
        };
    }
}
