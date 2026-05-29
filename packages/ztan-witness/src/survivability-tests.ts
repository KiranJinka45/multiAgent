/**
 * @packages/ztan-witness
 * 
 * ZTAN Distributed Survivability & WAL Replay Recovery Test Suite.
 * Directly addresses the high-priority strategic SRE requirements:
 * 1. Redis Failover Chaos & Epoch Rollback fencing.
 * 2. PostgreSQL Recovery Chaos & Interrupted Transaction self-healing.
 * 3. Long-Duration Entropy (continuous write storms, memory stability, latency percentiles).
 */

import { performance } from 'perf_hooks';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';
import * as dotenvExpand from 'dotenv-expand';
import * as fs from 'fs';
import * as path from 'path';
import type { EvidenceEntry } from '@packages/contracts';

// Load environment variables from workspace root
const rootEnv = path.resolve(process.cwd(), '.env');
if (fs.existsSync(rootEnv)) {
    const envConfig = dotenv.config({ path: rootEnv });
    dotenvExpand.expand(envConfig);
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runSurvivabilityTests() {
    const { EvidenceLedgerService } = await import('./index.js');
    const { db } = await import('@packages/db');
    const { redis } = await import('@packages/utils');
    const { EventCategory, VerificationState } = await import('@packages/contracts');

    console.log('\n================================================================');
    console.log('🛡️  STARTING ZTAN DISTRIBUTED SURVIVABILITY & WAL CHAOS DRILLS 🛡️');
    console.log('================================================================\n');

    const correlationId = `survivability-drill-${Date.now()}`;
    const signerId = 'sre-auth-operator-99';

    // Helper to clear state safely
    const clearState = async (cid: string) => {
        const keys = await redis.keys(`ztan:*:${cid}*`);
        if (keys.length > 0) {
            await redis.del(...keys);
        }
        await db.$transaction(async (tx: any) => {
            await tx.$executeRawUnsafe("SET LOCAL ztan.bypass_immutability = 'on';");
            await tx.ztanLedgerBlock.deleteMany({
                where: { blockId: { startsWith: `${cid}:` } }
            });
            // Use TRUNCATE to bypass FOR EACH ROW triggers (enforce_immutability)
            // which cause transaction timeouts on large row counts
            await tx.$executeRawUnsafe('TRUNCATE TABLE "ZtanWalLog" RESTART IDENTITY CASCADE;');
        }, { timeout: 30000 });
    };

    try {
        // Clear WAL log table globally to prevent unique constraint conflicts on the 'seq' field from previous test runs
        // Use TRUNCATE to bypass FOR EACH ROW triggers (enforce_immutability)
        // which cause P2028 transaction timeouts when row count is high
        await db.$executeRawUnsafe('TRUNCATE TABLE "ZtanWalLog" RESTART IDENTITY CASCADE;');

        // =========================================================================
        // DRILL 3: Redis Failover & Lock Epoch Rollback Chaos
        // =========================================================================
        console.log('👉 DRILL 3: Redis Failover & Lock Epoch Rollback Chaos...');
        await clearState(correlationId);

        // 1. Establish an initial healthy state
        await EvidenceLedgerService.append({
            category: EventCategory.MUTATION,
            source: { service: 'load-balancer', node: 'node-1', version: '2.4.0' },
            payload: { state: 'active' },
            correlationId,
            signerId
        });

        // 2. Intercept Redis get operation to simulate a stale lock promotion after failover
        const originalGet = redis.get;
        let preemptionCaught = false;

        try {
            redis.get = async (key: string) => {
                if (key === `ztan:lock:${correlationId}`) {
                    // Simulate that the active lock token in Redis has shifted (stale token detected)
                    return 'stale-preempted-epoch-token';
                }
                return originalGet.call(redis, key);
            };

            await EvidenceLedgerService.append({
                category: EventCategory.MUTATION,
                source: { service: 'load-balancer', node: 'node-1', version: '2.4.0' },
                payload: { state: 'interrupted' },
                correlationId,
                signerId
            });
        } catch (err: any) {
            if (err.message.includes('Fenced Write') || err.message.includes('expired or preempted')) {
                preemptionCaught = true;
                console.log(`✅ SUCCESS: Stale lock epoch rollback detected and fenced safely! Error: ${err.message}`);
            } else {
                console.error('[Drill 3] Unexpected error:', err);
            }
        } finally {
            redis.get = originalGet; // Restore original Redis client get method
        }

        if (!preemptionCaught) {
            console.error('❌ FAILURE: Lock epoch rollback was NOT fenced! GC lease expiry risk active.');
            process.exit(1);
        }

        // =========================================================================
        // DRILL 4: PostgreSQL Recovery & Interrupted Transaction Chaos
        // =========================================================================
        console.log('\n👉 DRILL 4: PostgreSQL Recovery & Interrupted Transaction Chaos...');
        const cidRecovery = `wal-recovery-${Date.now()}`;
        await clearState(cidRecovery);

        // 1. Manually write a PENDING WAL entry directly to DB, simulating a crash mid-append
        console.log('[Drill 4] Simulating append transaction crash...');
        
        const timestamp = Date.now();
        const mockEntry: EvidenceEntry = {
            id: uuidv4(),
            timestamp,
            sequence: 1,
            correlationId: cidRecovery,
            category: EventCategory.MUTATION,
            source: { service: 'k8s-operator', node: 'operator-01', version: '2.4.0' },
            payload: { deployment: 'auth-service', status: 'deploying' },
            integrity: {
                hash: 'sha256-mock-crash-wal-hash-value',
                previousHash: '0x0',
                signature: {
                    signerId,
                    algorithm: 'ed25519',
                    signature: `sig:${signerId}:mock-crash`,
                    signedAt: timestamp,
                    trustEpochId: '1',
                    scope: 'entry'
                },
                verificationState: VerificationState.VERIFIED
            }
        };

        // Insert directly to ZtanWalLog in PENDING status, skipping LedgerBlock commit
        await db.ztanWalLog.create({
            data: {
                seq: 1,
                type: EventCategory.MUTATION,
                payload: JSON.stringify(mockEntry),
                status: 'PENDING'
            }
        });
        console.log('[Drill 4] Simulated transaction crash created (uncommitted PENDING WAL entry in DB)');

        // 2. Query chain and assert that the inline WAL recovery self-heals the ledger block!
        console.log('[Drill 4] Replaying ledger chain (triggers automatic WAL crash recovery)...');
        const recoveredChain = await EvidenceLedgerService.getChain(cidRecovery);

        console.log(`[Drill 4] Replayed entries count: ${recoveredChain.entries.length}`);
        console.log(`[Drill 4] Replayed verification state: ${recoveredChain.verificationState}`);

        // Verify that the missing block was successfully reconstructed and committed
        const committedBlock = await db.ztanLedgerBlock.findFirst({
            where: { blockId: `${cidRecovery}:1` }
        });

        const walStatus = await db.ztanWalLog.findFirst({
            where: { seq: 1 }
        });

        if (committedBlock && walStatus?.status === 'COMMITTED' && recoveredChain.entries.length === 1) {
            console.log('✅ SUCCESS: Write-Ahead Log successfully self-healed and replayed the interrupted transaction!');
        } else {
            console.error('❌ FAILURE: WAL crash recovery failed to reconstruct the ledger blocks!');
            process.exit(1);
        }

        // =========================================================================
        // DRILL 5: Long-Duration Entropy Ingestion & Stress Contention
        // =========================================================================
        console.log('\n👉 DRILL 5: Long-Duration Entropy Ingestion & Stress Contention...');
        const cidEntropy = `entropy-drill-${Date.now()}`;
        await clearState(cidEntropy);

        const TOTAL_APPENDS = 160;
        const CONCURRENT_WORKERS = 4;

        const metrics = {
            totalAppends: 0,
            failedAppends: 0,
            latencies: [] as number[],
            sreTelemetries: [] as any[],
        };

        console.log(`🚀 Spawning ${CONCURRENT_WORKERS} concurrent SRE ingestion loops...`);
        console.log(`📊 Ingesting ${TOTAL_APPENDS} high-pressure event records with transient network jitter...\n`);

        const stormStart = performance.now();

        const workers = Array.from({ length: CONCURRENT_WORKERS }, async (_, workerId) => {
            const appendsPerWorker = TOTAL_APPENDS / CONCURRENT_WORKERS;

            for (let i = 0; i < appendsPerWorker; i++) {
                const seqStart = performance.now();
                const eventIndex = workerId * appendsPerWorker + i;

                try {
                    const entry = await EvidenceLedgerService.append({
                        category: EventCategory.MUTATION,
                        source: {
                            service: `sre-node-0${workerId + 1}`,
                            node: `core-pod-${workerId + 1}`,
                            version: '2.4.0'
                        },
                        payload: {
                            worker: workerId,
                            index: eventIndex,
                            timestamp: Date.now(),
                            activeNodes: 12,
                            memoryUsage: '342MB'
                        },
                        correlationId: cidEntropy,
                        signerId: `signer-hsm-0${workerId + 1}`
                    });

                    const duration = performance.now() - seqStart;
                    metrics.latencies.push(duration);
                    metrics.totalAppends++;

                    if ((entry as any)._sreTelemetry) {
                        metrics.sreTelemetries.push((entry as any)._sreTelemetry);
                    }
                } catch (err: any) {
                    console.error(`❌ Worker ${workerId + 1} failed append: ${err.message || err}`);
                    metrics.failedAppends++;
                }

                // Inject light randomized delays to simulate operational production network jitter
                await delay(Math.random() * 10 + 5);
            }
        });

        await Promise.all(workers);

        const stormDuration = performance.now() - stormStart;

        // Perform chain validation
        const chain = await EvidenceLedgerService.getChain(cidEntropy);

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

        const getTelemetryPercentiles = (arr: number[]) => {
            const sorted = [...arr].sort((a, b) => a - b);
            const p50 = sorted[Math.floor(sorted.length * 0.50)] || 0;
            const p90 = sorted[Math.floor(sorted.length * 0.90)] || 0;
            const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;
            const avg = sorted.reduce((sum, val) => sum + val, 0) / sorted.length || 0;
            return { avg, p50, p90, p99 };
        };

        const queueWaitStats = getTelemetryPercentiles(metrics.sreTelemetries.map(t => t.queueWaitTimeMs));
        const lockAcquireStats = getTelemetryPercentiles(metrics.sreTelemetries.map(t => t.lockAcquireTimeMs));
        const dbTxStats = getTelemetryPercentiles(metrics.sreTelemetries.map(t => t.dbTransactionTimeMs));
        const redisCacheStats = getTelemetryPercentiles(metrics.sreTelemetries.map(t => t.redisCacheTimeMs));
        const lockReleaseStats = getTelemetryPercentiles(metrics.sreTelemetries.map(t => t.lockReleaseTimeMs));

        const avgRetries = metrics.sreTelemetries.reduce((sum, t) => sum + t.retryCount, 0) / metrics.sreTelemetries.length || 0;
        const maxRetriesObserved = Math.max(...metrics.sreTelemetries.map(t => t.retryCount), 0);

        const avgQueueDepth = metrics.sreTelemetries.reduce((sum, t) => sum + t.queueDepth, 0) / metrics.sreTelemetries.length || 0;
        const maxQueueDepthObserved = Math.max(...metrics.sreTelemetries.map(t => t.queueDepth), 0);

        console.log('\n================================================================');
        console.log('📊 SURVIVABILITY DRILL TELEMETRY REPORT:');
        console.log('================================================================');
        console.log(`• Total Ingested Events      : ${metrics.totalAppends}`);
        console.log(`• Failed Appends             : ${metrics.failedAppends}`);
        console.log(`• Total Execution Time       : ${stormDuration.toFixed(2)} ms`);
        console.log(`• Average Append Latency     : ${avgLatency.toFixed(2)} ms`);
        console.log(`• P50 Latency (Median)       : ${p50.toFixed(2)} ms`);
        console.log(`• P90 Latency                : ${p90.toFixed(2)} ms`);
        console.log(`• P99 Latency                : ${p99.toFixed(2)} ms`);
        console.log(`• Replay Verification State  : ${chain.verificationState}`);
        console.log(`• Chronological Monotonicity : ${sequenceMonotonic ? '✅ PERFECT' : '❌ DRIFT DETECTED'}`);
        console.log(`• Cryptographic Hash Chaining: ${hashesLinked ? '✅ UNBROKEN' : '❌ INTEGRITY BREACHED'}`);
        console.log('================================================================\n');

        console.log('================================================================');
        console.log('🔍 TAIL LATENCY DRILL DEEP OBSERVED ANALYSIS (P99 EXPLOSION SOURCE):');
        console.log('================================================================');
        console.log(`• Avg Queue Depth             : ${avgQueueDepth.toFixed(1)} tasks (Max: ${maxQueueDepthObserved})`);
        console.log(`• Avg Redis Lock Retries      : ${avgRetries.toFixed(1)} attempts (Max: ${maxRetriesObserved})`);
        console.log('----------------------------------------------------------------');
        console.log('Latency Components Breakdown (Avg | P50 | P90 | P99):');
        console.log(`• Memory Queue Wait Time (HOL): ${queueWaitStats.avg.toFixed(1)}ms | ${queueWaitStats.p50.toFixed(1)}ms | ${queueWaitStats.p90.toFixed(1)}ms | ${queueWaitStats.p99.toFixed(1)}ms`);
        console.log(`• Redis Lock Acquire Time     : ${lockAcquireStats.avg.toFixed(1)}ms | ${lockAcquireStats.p50.toFixed(1)}ms | ${lockAcquireStats.p90.toFixed(1)}ms | ${lockAcquireStats.p99.toFixed(1)}ms`);
        console.log(`• PostgreSQL Transaction Time : ${dbTxStats.avg.toFixed(1)}ms | ${dbTxStats.p50.toFixed(1)}ms | ${dbTxStats.p90.toFixed(1)}ms | ${dbTxStats.p99.toFixed(1)}ms`);
        console.log(`• Redis Cache Commit Time     : ${redisCacheStats.avg.toFixed(1)}ms | ${redisCacheStats.p50.toFixed(1)}ms | ${redisCacheStats.p90.toFixed(1)}ms | ${redisCacheStats.p99.toFixed(1)}ms`);
        console.log(`• Redis Lock Release Time     : ${lockReleaseStats.avg.toFixed(1)}ms | ${lockReleaseStats.p50.toFixed(1)}ms | ${lockReleaseStats.p90.toFixed(1)}ms | ${lockReleaseStats.p99.toFixed(1)}ms`);
        console.log('================================================================\n');

        // Save detailed JSON telemetry for validation audit reporting
        const telemetryFilePath = path.resolve(process.cwd(), 'packages/ztan-witness/sre_survivability_telemetry.json');
        fs.writeFileSync(telemetryFilePath, JSON.stringify({
            storm: {
                concurrentWorkers: CONCURRENT_WORKERS,
                totalAppends: metrics.totalAppends,
                failedAppends: metrics.failedAppends,
                stormDurationMs: stormDuration,
                avgLatencyMs: avgLatency,
                p50LatencyMs: p50,
                p90LatencyMs: p90,
                p99LatencyMs: p99,
                verificationState: chain.verificationState,
                sequenceMonotonic,
                hashesLinked
            },
            components: {
                queueDepth: { avg: avgQueueDepth, max: maxQueueDepthObserved },
                lockRetries: { avg: avgRetries, max: maxRetriesObserved },
                queueWaitMs: queueWaitStats,
                lockAcquireMs: lockAcquireStats,
                dbTransactionMs: dbTxStats,
                redisCacheMs: redisCacheStats,
                lockReleaseMs: lockReleaseStats
            }
        }, null, 4));

        // Cleanup states before exit
        await clearState(correlationId);
        await clearState(cidRecovery);
        await clearState(cidEntropy);

        if (sequenceMonotonic && hashesLinked && metrics.failedAppends === 0 && chain.verificationState === VerificationState.VERIFIED) {
            console.log('🎉 ALL DISTRIBUTED SURVIVABILITY DRILLS COMPLETED SUCCESSFULLY UNDER TESTED CONDITIONS!');
            console.log('================================================================\n');
            process.exit(0);
        } else {
            console.error('❌ SURVIVABILITY DRILLS ENCOUNTERED INTEGRITY OR LIVENESS DEGRADATION.');
            process.exit(1);
        }

    } catch (err: any) {
        console.error('Catastrophic failure during Survivability Drill Execution:', err);
        process.exit(1);
    }
}

runSurvivabilityTests();
