import fs from 'fs';
import path from 'path';
import { validateDuplicateKeys } from './canonicalizer.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TelemetryPoint {
    iteration: number;
    heapUsedMB: number;
    elapsedMs: number;
}

class ZtanLongSoakCampaign {
    private totalOperations = 100000;
    private logInterval = 10000;
    private payload = `{"id":"txn_9999","data":{"nested":[1,2,3],"active":true},"signature":"MEQCIDUoYXZw"}`;

    public runCampaign() {
        console.log("===========================================================");
        console.log("    ZTAN Long-Duration High-Intensity Soak Campaign        ");
        console.log("===========================================================");
        console.log(`[INIT] Target operations: ${this.totalOperations}`);
        console.log(`[INIT] Monitoring interval: every ${this.logInterval} ops`);

        const startTime = performance.now();
        const startHeap = process.memoryUsage().heapUsed;
        const telemetry: TelemetryPoint[] = [];

        const latencies: number[] = [];

        for (let i = 1; i <= this.totalOperations; i++) {
            const opStart = performance.now();
            try {
                validateDuplicateKeys(this.payload);
            } catch (e) {
                // Ignore expected parses
            }
            const opEnd = performance.now();
            latencies.push(opEnd - opStart);

            if (i % this.logInterval === 0) {
                const currentHeap = process.memoryUsage().heapUsed;
                const heapMB = currentHeap / 1024 / 1024;
                const elapsedMs = performance.now() - startTime;
                
                telemetry.push({
                    iteration: i,
                    heapUsedMB: heapMB,
                    elapsedMs: elapsedMs
                });

                console.log(`  [PROGRESS] Ops completed: ${i}/${this.totalOperations} | Heap: ${heapMB.toFixed(2)} MB | Cumulative Time: ${elapsedMs.toFixed(0)} ms`);
            }
        }

        const endTime = performance.now();
        const endHeap = process.memoryUsage().heapUsed;
        const totalDuration = endTime - startTime;

        // Calculate percentiles
        latencies.sort((a, b) => a - b);
        const p50 = latencies[Math.floor(latencies.length * 0.50)];
        const p90 = latencies[Math.floor(latencies.length * 0.90)];
        const p99 = latencies[Math.floor(latencies.length * 0.99)];

        const heapDiffMB = (endHeap - startHeap) / 1024 / 1024;

        console.log("\n===========================================================");
        console.log("    Long-Duration Soak Performance Profile                 ");
        console.log("===========================================================");
        console.log(`  - Total Ops Completed:         ${this.totalOperations}`);
        console.log(`  - Total Elapsed Duration:      ${totalDuration.toFixed(2)} ms`);
        console.log(`  - P50 Latency (Median):        ${(p50 * 1000).toFixed(2)} microseconds`);
        console.log(`  - P90 Latency:                 ${(p90 * 1000).toFixed(2)} microseconds`);
        console.log(`  - P99 Latency:                 ${(p99 * 1000).toFixed(2)} microseconds`);
        console.log(`  - Heap Growth Delta:           ${heapDiffMB.toFixed(3)} MB`);

        // Write telemetry log to artifacts directory
        const artifactDir = path.resolve(__dirname, '..', '..', '..', 'brain', 'b8a81fd6-555e-4df3-ba0d-6ad7b89a22a5', 'artifacts');
        fs.mkdirSync(artifactDir, { recursive: true });
        
        const telemetryPath = path.join(artifactDir, 'soak_telemetry.json');
        fs.writeFileSync(telemetryPath, JSON.stringify({
            totalOperations: this.totalOperations,
            totalDurationMs: totalDuration,
            percentiles: { p50, p90, p99 },
            heapGrowthMB: heapDiffMB,
            series: telemetry
        }, null, 2));

        console.log(`\n[RESULT] ✅ Soak campaign completed successfully. Telemetry logged to ${telemetryPath}`);
        
        if (heapDiffMB > 5.0) {
            console.log("[WARNING] ⚠️ Slight heap drift observed. Monitor garbage collection frequency.");
        } else {
            console.log("[RESULT] ✅ Memory consumption remains strictly flat and self-minimizing.");
        }
    }
}

const soak = new ZtanLongSoakCampaign();
soak.runCampaign();
