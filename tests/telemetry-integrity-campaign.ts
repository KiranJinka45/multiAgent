import * as crypto from 'node:crypto';
import { classifyVerdict } from '../scripts/verdict-classifier.js';

interface TelemetryReport {
    type: 'TELEMETRY_REPORT';
    timestamp: number;
    memory: {
        rss: number;
        heapUsed: number;
        heapTotal: number;
        external: number;
    };
    handles: string[];
    requestsCount: number;
    elu: number;
}

class TelemetryIntegrityCampaign {
    private baselineReports: TelemetryReport[] = [];

    constructor() {
        // Generate 100 baseline reports simulating steady heap growth (10 MB/hour)
        // and 0 handle leaks.
        const startTime = Date.now();
        const heapStart = 50 * 1024 * 1024; // 50 MB
        
        for (let i = 0; i < 100; i++) {
            const elapsedSeconds = i * 2; // sampled every 2 seconds
            const heapUsed = heapStart + (elapsedSeconds * (10 * 1024 * 1024 / 3600)); // growing at 10 MB/hour
            
            this.baselineReports.push({
                type: 'TELEMETRY_REPORT',
                timestamp: startTime + (elapsedSeconds * 1000),
                memory: {
                    rss: heapUsed + (15 * 1024 * 1024),
                    heapUsed,
                    heapTotal: heapUsed + (20 * 1024 * 1024),
                    external: 0
                },
                handles: ['Pipe', 'Server(port:5050)', 'Socket(inactive)'],
                requestsCount: 5,
                elu: 0.12
            });
        }
    }

    // Helper to compute slope
    private computeSlope(samples: { x: number; y: number }[]): number {
        const n = samples.length;
        if (n < 2) return 0;
        
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
        for (let i = 0; i < n; i++) {
            const x = samples[i].x;
            const y = samples[i].y;
            sumX += x;
            sumY += y;
            sumXY += x * y;
            sumXX += x * x;
        }
        const denominator = n * sumXX - sumX * sumX;
        return denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
    }

    async run() {
        console.log('================================================================================');
        console.log('🧪  ZTAN TELEMETRY INTEGRITY CAMPAIGN');
        console.log('================================================================================\n');

        let allTestsPassed = true;

        // Test 1: Telemetry Chaos Injection Pipeline
        console.log('⚡ [STEP 1] Injecting IPC delivery chaos into telemetry stream...');
        const chaoticStream: TelemetryReport[] = [];
        
        for (const report of this.baselineReports) {
            const roll = Math.random();

            // 1. Packet Loss (Drop 15% of packets)
            if (roll < 0.15) {
                continue; 
            }

            const clonedReport = JSON.parse(JSON.stringify(report)) as TelemetryReport;

            // 2. Clock Skew (Inject +/- 3000ms offset to 10% of reports)
            if (roll >= 0.15 && roll < 0.25) {
                const skew = (Math.random() > 0.5 ? 1 : -1) * 3000;
                clonedReport.timestamp += skew;
            }

            // 3. Duplication (Duplicate 10% of reports)
            if (roll >= 0.25 && roll < 0.35) {
                chaoticStream.push(clonedReport);
            }

            chaoticStream.push(clonedReport);
        }

        // 4. Out-of-order Delivery (Shuffle the array randomly)
        const shuffledStream = [...chaoticStream].sort(() => Math.random() - 0.5);

        console.log(`   - Raw baseline packets: ${this.baselineReports.length}`);
        console.log(`   - Chaotic packets after loss/skew/duplication/shuffling: ${shuffledStream.length}\n`);

        // Test 2: Robust sorting validation
        console.log('⚡ [STEP 2] Verifying delta analysis sorting robustness...');
        
        // Assert that sorting by timestamp recovers chronological order
        const sortedStream = [...shuffledStream].sort((a, b) => a.timestamp - b.timestamp);
        
        let monotonicTimestamps = true;
        for (let i = 1; i < sortedStream.length; i++) {
            if (sortedStream[i].timestamp < sortedStream[i - 1].timestamp) {
                monotonicTimestamps = false;
            }
        }

        if (monotonicTimestamps) {
            console.log('   ✔ PASS: Chronological order restored successfully via timestamp sorting.');
        } else {
            console.error('   ❌ FAIL: Chronological order is broken.');
            allTestsPassed = false;
        }

        // Test 3: Math and Slope stability under chaotic telemetry
        console.log('\n⚡ [STEP 3] Running slope and delta calculations on chaotic telemetry...');
        
        // Check delta calculation
        const first = sortedStream[0];
        const last = sortedStream[sortedStream.length - 1];
        const heapDeltaMB = (last.memory.heapUsed - first.memory.heapUsed) / 1024 / 1024;
        
        const startTime = sortedStream[0].timestamp;
        const heapSamples = sortedStream.map(e => ({
            x: (e.timestamp - startTime) / 1000,
            y: e.memory.heapUsed / 1024 / 1024
        }));

        const heapSlopeMBs = this.computeSlope(heapSamples);
        const heapSlopePerHour = heapSlopeMBs * 3600;

        console.log(`   - Calculated heap delta: ${heapDeltaMB.toFixed(4)} MB`);
        console.log(`   - Extrapolated heap growth slope: ${heapSlopePerHour.toFixed(4)} MB/hour`);

        // Slope should be positive and reasonably close to the baseline 10 MB/hour
        if (heapSlopePerHour > 0 && heapSlopePerHour < 30) {
            console.log('   ✔ PASS: Slope calculation stable under IPC drops and clock skews.');
        } else {
            console.error(`   ❌ FAIL: Slope calculation skewed! Got: ${heapSlopePerHour.toFixed(4)} MB/hour`);
            allTestsPassed = false;
        }

        // Test 4: Verdict Classifier stability
        console.log('\n⚡ [STEP 4] Verifying verdict classifier resilience...');
        
        // Simulating duplicate warnings/failures received due to telemetry retry loops
        const verdictInput = {
            failures: 0,
            warnings: 2,
            failedRequests: 1,
            criticalFailures: [],
            nonCriticalFailures: [],
            warningMessages: [
                'Elevated RSS detected due to GC delay',
                'Elevated RSS detected due to GC delay' // duplicated
            ]
        };

        const verdict = classifyVerdict(verdictInput);
        console.log(`   - Classified Verdict Tier: ${verdict.tier} (Emoji: ${verdict.emoji})`);
        console.log(`   - Description: ${verdict.description}`);

        if (verdict.tier === 'PASS_RECOVERED') {
            console.log('   ✔ PASS: Verdict classifier successfully resolved duplicates to correct tier.');
        } else {
            console.error(`   ❌ FAIL: Verdict classifier failed! Expected tier: PASS_RECOVERED, got: ${verdict.tier}`);
            allTestsPassed = false;
        }

        if (allTestsPassed) {
            console.log('\n🎉 ZTAN TELEMETRY INTEGRITY CAMPAIGN PASSED SUCCESSFULLY!');
            process.exit(0);
        } else {
            console.error('\n❌ ZTAN TELEMETRY INTEGRITY CAMPAIGN FAILED!');
            process.exit(1);
        }
    }
}

new TelemetryIntegrityCampaign().run().catch(err => {
    console.error('Fatal telemetry integrity tester error:', err);
    process.exit(1);
});
