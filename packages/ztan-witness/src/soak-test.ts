/**
 * @packages/ztan-witness
 * 
 * ZTAN Witness Long-Duration Soak & Multi-Process Contention Test Harness.
 * Directly addresses the Strategic SRE Priorities:
 * 1. Long-duration soak testing (append storms under stress).
 * 2. Multi-process/thread contention simulation.
 * 3. Observability telemetry capturing (latencies, queue depths, rejections).
 */

import { EvidenceLedgerService } from './index.js';
import { db } from '@packages/db';
import { redis } from '@packages/utils';
import { EventCategory, VerificationState } from '@packages/contracts';
import { performance } from 'perf_hooks';

// simple delay utility
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runSoakTest() {
    console.log('\n================================================================');
    console.log('⚡ STARTING ZTAN RECORDER CONCURRENCY SOAK & CONTENTION DRILL ⚡');
    console.log('================================================================\n');

    // 1. Clean live database and Redis state with immutability bypass
    console.log('🧹 Preparing pristine infrastructure state...');
    await db.$transaction(async (tx: any) => {
        await tx.$executeRawUnsafe("SET LOCAL ztan.bypass_immutability = 'on';");
        await tx.ztanLedgerBlock.deleteMany({});
        await tx.ztanWalLog.deleteMany({});
        await tx.ztanSnapshot.deleteMany({});
    });
    
    const redisKeys = await redis.keys('ztan:*');
    if (redisKeys.length > 0) {
        await redis.del(...redisKeys);
    }
    console.log('✅ Infrastructure cleared successfully.\n');

    const TOTAL_APPENDS = 120; // High count for soak simulation
    const CONCURRENT_WORKERS = 4; // Simulated multi-process/thread concurrency
    const correlationId = 'soak-incident-cluster-01';

    // Observability metrics collector
    const metrics = {
        totalAppends: 0,
        failedAppends: 0,
        latencies: [] as number[],
        startTimes: [] as number[],
        queueDepthSnapshots: [] as number[],
    };

    console.log(`🚀 Spawning ${CONCURRENT_WORKERS} concurrent SRE ingestion loops...`);
    console.log(`📊 Ingesting a total of ${TOTAL_APPENDS} high-pressure event records...\n`);

    const startTime = performance.now();

    // Spawn concurrent ingestion workers
    const workers = Array.from({ length: CONCURRENT_WORKERS }, async (_, workerId) => {
        const appendsPerWorker = TOTAL_APPENDS / CONCURRENT_WORKERS;
        
        for (let i = 0; i < appendsPerWorker; i++) {
            const seqStart = performance.now();
            const eventIndex = workerId * appendsPerWorker + i;
            
            try {
                // Periodically capture simulated queue depth
                if (eventIndex % 5 === 0) {
                    metrics.queueDepthSnapshots.push(eventIndex);
                }

                await EvidenceLedgerService.append({
                    category: EventCategory.MUTATION,
                    source: {
                        service: `sre-operator-node-0${workerId + 1}`,
                        node: `ztan-core-pod-x${workerId + 1}`,
                        version: '2.4.0'
                    },
                    payload: {
                        worker: workerId,
                        eventIndex,
                        action: 'DEPLOY_MUTATION',
                        timestamp: Date.now(),
                        driftDetected: false
                    },
                    correlationId,
                    signerId: `signer-hsm-0${workerId + 1}`
                });

                const seqDuration = performance.now() - seqStart;
                metrics.latencies.push(seqDuration);
                metrics.totalAppends++;

            } catch (err: any) {
                console.error(`❌ Worker ${workerId + 1} failed on append ${i + 1}:`, err.message || err);
                metrics.failedAppends++;
            }

            // Introduce slight randomized transactional delay to simulate production latency
            await delay(Math.random() * 10 + 5);
        }
    });

    // Wait for all workers to settle their append storms
    await Promise.all(workers);

    const totalDuration = performance.now() - startTime;

    console.log('\n================================================================');
    console.log('🔬 REPLAY & INTEGRITY ANALYSIS GATES');
    console.log('================================================================');

    console.log('👉 Reconstructing complete evidence chain from PostgreSQL...');
    const replayStart = performance.now();
    const chain = await EvidenceLedgerService.getChain(correlationId);
    const replayDuration = performance.now() - replayStart;

    // Run structural integrity assertions
    const chainLength = chain.entries.length;
    let sequenceMonotonic = true;
    let hashesLinked = true;

    for (let i = 1; i < chain.entries.length; i++) {
        const prev = chain.entries[i - 1];
        const curr = chain.entries[i];
        
        if (curr.sequence !== prev.sequence + 1) {
            sequenceMonotonic = false;
        }
        if (curr.integrity.previousHash !== prev.integrity.hash) {
            hashesLinked = false;
        }
    }

    // Sort latencies to compute percentiles
    const sortedLatencies = [...metrics.latencies].sort((a, b) => a - b);
    const p50 = sortedLatencies[Math.floor(sortedLatencies.length * 0.50)] || 0;
    const p90 = sortedLatencies[Math.floor(sortedLatencies.length * 0.90)] || 0;
    const p99 = sortedLatencies[Math.floor(sortedLatencies.length * 0.99)] || 0;
    const avgLatency = sortedLatencies.reduce((sum, val) => sum + val, 0) / sortedLatencies.length || 0;

    console.log('\n📊 SOAK DRILL TELEMETRY REPORT:');
    console.log(`• Total Ingested Events      : ${metrics.totalAppends}`);
    console.log(`• Failed Appends             : ${metrics.failedAppends}`);
    console.log(`• Total Execution Time       : ${totalDuration.toFixed(2)} ms`);
    console.log(`• Average Append Latency     : ${avgLatency.toFixed(2)} ms`);
    console.log(`• P50 Latency (Median)       : ${p50.toFixed(2)} ms`);
    console.log(`• P90 Latency                : ${p90.toFixed(2)} ms`);
    console.log(`• P99 Latency                : ${p99.toFixed(2)} ms`);
    console.log(`• Replay Extraction Time     : ${replayDuration.toFixed(2)} ms`);
    console.log(`• Reconstructed Chain Size   : ${chainLength} entries`);
    console.log(`• Verification State         : ${chain.verificationState}`);
    console.log(`• Chronological Monotonicity : ${sequenceMonotonic ? '✅ PERFECT' : '❌ DRIFT DETECTED'}`);
    console.log(`• Cryptographic Hash Chaining: ${hashesLinked ? '✅ UNBROKEN' : '❌ INTEGRITY BREACHED'}`);
    console.log(`• Merkle Checkpoint Anchors  : ${chain.metrics.recoveryConfidence === 1.0 ? '✅ SECURED' : '⚠️ WARNING'}`);
    
    console.log('\n================================================================');
    if (sequenceMonotonic && hashesLinked && metrics.failedAppends === 0 && chain.verificationState === VerificationState.VERIFIED) {
        console.log('🎉 SOAK & CONTION DRILL COMPLETED WITH ABSOLUTE SUCCESS!');
        console.log('================================================================\n');
        process.exit(0);
    } else {
        console.log('❌ DRILL FAILED: INTEGRITY OR CONCURRENCY ISSUES ENCOUNTERED.');
        console.log('================================================================\n');
        process.exit(1);
    }
}

runSoakTest().catch(err => {
    console.error('Fatal crash in soak test:', err);
    process.exit(1);
});
