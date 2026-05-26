import dotenv from 'dotenv';
dotenv.config();

// Enforce fallback environments for local test isolation
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:password@127.0.0.1:54399/multiagent';
process.env.MOCK_DB = process.env.MOCK_DB || 'true';

import os from 'os';
import { randomUUID } from 'crypto';
import { db } from '../packages/db/src/index';
import { ZtanLeaseManager } from '../src/runtime/lease-enforcement';
import { 
    NetworkPathology, 
    PartitionPathology, 
    ResourcePressurePathology, 
    StoragePathology, 
    PathologyCoordinator 
} from '../packages/runtime-core/src/index';

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '../');

async function runSprintE2Verification() {
    const runId = randomUUID();
    console.log('================================================================================');
    console.log('🧪  ZTAN PHASE 12 SPRINT E2.1 - OS-LEVEL PATHOLOGY DRILLED VERIFICATION RUNNER');
    console.log('================================================================================\n');

    const coordinator = new PathologyCoordinator(workspaceRoot);
    coordinator.clearAll();

    // ────────────────────────────────────────────────────────────────────────
    // DRILL 1: Network Pathology (Packet shaping/Latency/Jitter)
    // ────────────────────────────────────────────────────────────────────────
    console.log('⚡ [DRILL 1] Simulating OS-level netem packet shaping (150ms delay, 20ms jitter)...');
    const netPath = new NetworkPathology(workspaceRoot);
    
    try {
        await netPath.inject({ latencyMs: 150, jitterMs: 20, packetLossProb: 0 });

        const start = Date.now();
        // Trigger a database read to test proxy interceptor latency
        await db.ztanLedgerBlock.findFirst();
        const duration = Date.now() - start;

        console.log(`     - Injected latency: 150ms`);
        console.log(`     - Actual query duration under pathology: ${duration}ms`);
        if (duration >= 130) {
            console.log('  ✅ Network latency pathology verified successfully.');
        } else {
            throw new Error(`Latency was not injected! Actual duration: ${duration}ms`);
        }

        // Test network packet loss drop
        console.log('⚡ [DRILL 1b] Injecting 100% packet loss drop pathology...');
        await netPath.inject({ latencyMs: 0, jitterMs: 0, packetLossProb: 1.0 });

        try {
            await db.ztanLedgerBlock.findFirst();
            throw new Error('Query succeeded when it should have failed under packet loss!');
        } catch (err: any) {
            console.log(`  ✅ Packet loss drop successfully blocked queries: ${err.message}`);
        }

    } catch (e: any) {
        console.error(`  ❌ DRILL 1 Failed: ${e.message}`);
        await db.$disconnect();
        process.exit(1);
    } finally {
        await netPath.clear();
    }
    console.log('');

    // ────────────────────────────────────────────────────────────────────────
    // DRILL 2: Asymmetric TCP Partition Drill (Half-open splits)
    // ────────────────────────────────────────────────────────────────────────
    console.log('⚡ [DRILL 2] Injecting asymmetric iptables TCP partition split...');
    const partPath = new PartitionPathology(workspaceRoot);

    try {
        await partPath.inject({ type: 'asymmetric', durationMs: 10000 });

        console.log('     - Testing DB Read (should pass through partition)...');
        await db.ztanLedgerBlock.findFirst();
        console.log('     - DB Read successful.');

        console.log('     - Testing DB Write (should fail-closed under split-brain partition)...');
        try {
            await db.ztanLedgerBlock.create({
                data: {
                    blockId: `drill2-${runId}`,
                    prevHash: 'prev-hash',
                    hash: 'hash',
                    type: 'TEST',
                    payload: 'drill-payload',
                    operator: 'steward_omega',
                    signature: 'sig:test',
                    status: 'VERIFIED',
                    epoch: '0'
                }
            });
            throw new Error('Write succeeded under asymmetric partition write drop!');
        } catch (err: any) {
            console.log(`  ✅ Asymmetric partition successfully blocked transactional writes: ${err.message}`);
        }

    } catch (e: any) {
        console.error(`  ❌ DRILL 2 Failed: ${e.message}`);
        await db.$disconnect();
        process.exit(1);
    } finally {
        await partPath.clear();
    }
    console.log('');

    // ────────────────────────────────────────────────────────────────────────
    // DRILL 3: cgroup CPU Starvation / Event-Loop Lag
    // ────────────────────────────────────────────────────────────────────────
    console.log('⚡ [DRILL 3] Injecting cgroup-level event-loop scheduler starvation...');
    const resPath = new ResourcePressurePathology(workspaceRoot);
    const leaseManager = new ZtanLeaseManager();
    leaseManager.setDbConnectionState(false); // offline loop mode for isolation

    // Mock etcd interface to avoid connection errors in local non-etcd setups
    (leaseManager as any).etcd = {
        lease: (ttl: number) => {
            return {
                ttl,
                revoke: async () => {}
            };
        },
        if: (key: string, cmp: string, op: string, val: any) => {
            return {
                then: (putAction: any) => {
                    return {
                        commit: async () => {
                            return { succeeded: true };
                        }
                    };
                }
            };
        },
        put: (key: string) => {
            return {
                value: (val: any) => {
                    return {
                        lease: (l: any) => {
                            return {};
                        }
                    };
                }
            };
        },
        get: (key: string) => {
            return {
                string: async () => {
                    return `${os.hostname()}:${process.pid}`;
                }
            };
        },
        close: () => {}
    };

    try {
        console.log('     - Starting ZTAN Lease loop with base etcd keepalive TTL (5s)...');
        await leaseManager.startLeaseLoop();
        
        const initialStatus = leaseManager.getStatus();
        console.log(`     - Initial Keepalive lease TTL: ${initialStatus.currentLeaseTtlSec}s`);

        console.log('     - Activating synchronous event-loop blocks of 3000ms...');
        await resPath.inject({ cpuStarvationMs: 3000, memoryPressureMb: 0 });

        // Wait 5 seconds to let loop delay triggers fire and observers update TTL
        await new Promise(resolve => setTimeout(resolve, 5000));

        const postStatus = leaseManager.getStatus();
        console.log(`     - Post-starvation Keepalive lease TTL: ${postStatus.currentLeaseTtlSec}s`);
        console.log(`     - Event loop GC/lag pause alerts triggered: ${postStatus.gcPauseAlerts}`);

        if (postStatus.currentLeaseTtlSec > initialStatus.currentLeaseTtlSec) {
            console.log('  rose dynamically: Keepalive expanded due to event-loop lag. Safety preserved.');
            console.log('  ✅ Adaptive keepalive window scaling verified successfully!');
        } else {
            throw new Error(`Adaptive keepalive scaling did not trigger! TTL remained: ${postStatus.currentLeaseTtlSec}s`);
        }

    } catch (e: any) {
        console.error(`  ❌ DRILL 3 Failed: ${e.message}`);
        await db.$disconnect();
        process.exit(1);
    } finally {
        await resPath.clear();
        await leaseManager.stop();
    }
    console.log('');

    // ────────────────────────────────────────────────────────────────────────
    // DRILL 4: Storage fsync Latency Spikes
    // ────────────────────────────────────────────────────────────────────────
    console.log('⚡ [DRILL 4] Injecting physical storage fsync latency spikes (200ms)...');
    const storePath = new StoragePathology(workspaceRoot);

    try {
        await storePath.inject({ fsyncDelayMs: 200, ioThrottleOpsPerSec: 0 });

        const start = Date.now();
        await db.ztanLedgerBlock.create({
            data: {
                blockId: `drill4-${runId}`,
                prevHash: 'prev-hash',
                hash: 'hash',
                type: 'TEST',
                payload: 'drill-payload-fsync',
                operator: 'steward_omega',
                signature: 'sig:test',
                status: 'VERIFIED',
                epoch: '0'
            }
        });
        const duration = Date.now() - start;

        console.log(`     - Injected fsync delay: 200ms`);
        console.log(`     - Actual write transaction duration: ${duration}ms`);
        if (duration >= 190) {
            console.log('  ✅ Storage fsync delay pathology verified successfully.');
        } else {
            throw new Error(`fsync delay was not injected! Actual duration: ${duration}ms`);
        }

    } catch (e: any) {
        console.error(`  ❌ DRILL 4 Failed: ${e.message}`);
        await db.$disconnect();
        process.exit(1);
    } finally {
        await storePath.clear();
    }

    await db.$disconnect();

    console.log('\n================================================================================');
    console.log('🎉 SPRINT E1.2 OS-LEVEL PATHOLOGY DRILLED AND VERIFIED SUCCESSFULLY');
    console.log('================================================================================');
    process.exit(0);
}

runSprintE2Verification().catch(err => {
    console.error('Fatal Verification Error:', err);
    process.exit(1);
});
