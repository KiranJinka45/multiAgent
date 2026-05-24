import * as fs from 'node:fs';
import * as path from 'node:path';
import crypto from 'node:crypto';
import { 
    DurableSegmentedWal, 
    SimulatedReplicationTransport,
    FollowerSyncAgent,
    ReplicatedWalCoordinator,
    QuorumReplicatedStore,
    DistributedLeaseManager,
    QuorumDurabilityException,
    canonicalizeJson
} from '../../packages/production-pilot/src/index.js';
import { logger } from '../../packages/observability/src/index.js';

class ReplicationQuorumTester {
    private testDir = path.join(process.cwd(), '.ztan', 'test-replication-' + Math.random().toString(36).substr(2, 9));

    private cleanTestDir() {
        if (fs.existsSync(this.testDir)) {
            fs.rmSync(this.testDir, { recursive: true, force: true });
        }
    }

    async run() {
        logger.info('🏁 [TEST] Starting PHASE L: FOLLOWER REPLICATION & QUORUM DURABILITY TEST CAMPAIGN');
        let passed = 0;
        let total = 0;

        // Ensure clean state
        this.cleanTestDir();

        // Setup common cluster components
        const transport = new SimulatedReplicationTransport();

        const dirA = path.join(this.testDir, 'node-a');
        const dirB = path.join(this.testDir, 'node-b');
        const dirC = path.join(this.testDir, 'node-c');

        const walA = new DurableSegmentedWal<any>({ walDir: dirA, syncEveryWrite: true });
        const walB = new DurableSegmentedWal<any>({ walDir: dirB, syncEveryWrite: true });
        const walC = new DurableSegmentedWal<any>({ walDir: dirC, syncEveryWrite: true });

        const agentB = new FollowerSyncAgent<any>('node-b', walB);
        const agentC = new FollowerSyncAgent<any>('node-c', walC);

        const coordinatorA = new ReplicatedWalCoordinator<any>('node-a', walA, transport);
        coordinatorA.registerFollowers(['node-b', 'node-c']);

        // Register transport handlers
        transport.registerNode('node-a', async (msg) => {
            if (msg.type === 'SYNC_REQUEST') {
                const responsePayload = coordinatorA.handleSyncRequest(msg.payload);
                return {
                    type: 'SYNC_RESPONSE',
                    senderId: 'node-a',
                    epoch: msg.epoch,
                    payload: responsePayload
                };
            }
            throw new Error(`Unsupported message type for leader: ${msg.type}`);
        });

        transport.registerNode('node-b', async (msg) => {
            if (msg.type === 'APPEND_ENTRIES') {
                const res = await agentB.handleAppendEntries(msg.payload);
                return {
                    type: 'APPEND_ENTRIES', // Response message
                    senderId: 'node-b',
                    epoch: msg.epoch,
                    payload: res
                };
            }
            throw new Error(`Unsupported message for node-b: ${msg.type}`);
        });

        transport.registerNode('node-c', async (msg) => {
            if (msg.type === 'APPEND_ENTRIES') {
                const res = await agentC.handleAppendEntries(msg.payload);
                return {
                    type: 'APPEND_ENTRIES', // Response message
                    senderId: 'node-c',
                    epoch: msg.epoch,
                    payload: res
                };
            }
            throw new Error(`Unsupported message for node-c: ${msg.type}`);
        });

        // Initialize lease manager for node-a (Leader)
        const leaseManagerA = new DistributedLeaseManager('node-a', 'test/ztan/primary', undefined, true);
        const lease = await leaseManagerA.acquireLeadership(10);
        const activeEpoch = leaseManagerA.getCurrentEpoch();

        const quorumStore = new QuorumReplicatedStore<any>(coordinatorA, leaseManagerA);

        // ─── Scenario 1: Quorum Write Success ───
        total++;
        logger.info('📂 [Scenario 1] Verifying quorum write success on a healthy 3-node cluster...');
        try {
            const block = await quorumStore.appendWithQuorum({ msg: 'Transaction 1: healthy replication state' });
            assert(block.sequence === 1, `Expected sequence 1, got ${block.sequence}`);

            // Recover follower WALs to verify appends completed synchronously
            const recoveredB = walB.recoverLedger();
            const recoveredC = walC.recoverLedger();

            assert(recoveredB.length === 1, `Follower B should have 1 block, has ${recoveredB.length}`);
            assert(recoveredC.length === 1, `Follower C should have 1 block, has ${recoveredC.length}`);
            assert(recoveredB[0].hash === block.hash, 'Follower B block hash match');
            assert(recoveredC[0].hash === block.hash, 'Follower C block hash match');

            logger.info('  ✅ PASS: Replication achieved across all three healthy nodes with full hash alignment');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 1');
            console.error(e);
        }

        // ─── Scenario 2: Quorum Write Blocked ───
        total++;
        logger.info('🛡️  [Scenario 2] Verifying quorum write block on partition isolates (2 out of 3 unreachable)...');
        try {
            // Partition node-a from both followers (node-b and node-c)
            transport.injectPartition('node-a', 'node-b');
            transport.injectPartition('node-a', 'node-c');

            let threwQuorumErr = false;
            try {
                await quorumStore.appendWithQuorum({ msg: 'Transaction 2: quarantined append' });
            } catch (err: any) {
                if (err instanceof QuorumDurabilityException && err.message.includes('Failed to achieve replication write quorum')) {
                    threwQuorumErr = true;
                    logger.info(`  Caught expected quorum exception: ${err.message}`);
                } else {
                    logger.error(`  Caught unexpected exception: ${err.message}`);
                }
            }

            assert(threwQuorumErr === true, 'Append must fail when majority nodes are partitioned');

            // Verify local WAL on leader is updated, but followers are NOT updated
            const recoveredB = walB.recoverLedger();
            assert(recoveredB.length === 1, `Follower B must not have ingested transaction 2, count: ${recoveredB.length}`);

            logger.info('  ✅ PASS: Write block successfully enforced during network partitions, preventing split-brain');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 2');
            console.error(e);
        }

        // ─── Scenario 3: Follower Anti-Entropy Repair ───
        total++;
        logger.info('🩹 [Scenario 3] Verifying follower pull-based anti-entropy catchup repair...');
        try {
            // Heal partition for node-c only (so node-a + node-c = quorum of 2 achieved)
            transport.removePartition('node-a', 'node-c');

            // Now append two transactions which will succeed on A and C, but not B
            const block2 = await quorumStore.appendWithQuorum({ tx: 'ledger-update-2' });
            const block3 = await quorumStore.appendWithQuorum({ tx: 'ledger-update-3' });

            const recoveredC = walC.recoverLedger();
            const recoveredB = walB.recoverLedger();

            assert(recoveredC.length === 4, `Follower C should have caught up to 4 blocks, has ${recoveredC.length}`);
            assert(recoveredB.length === 1, `Follower B should still only have 1 block, has ${recoveredB.length}`);

            // Heal partition for node-b
            transport.removePartition('node-a', 'node-b');

            // Trigger manual anti-entropy sync on Follower B
            logger.info('  Triggering Follower B anti-entropy catchup...');
            const caughtUp = await agentB.runAntiEntropySync('node-a', transport);
            assert(caughtUp === 3, `Expected 3 caught up blocks, got ${caughtUp}`);

            const finalRecoveredB = walB.recoverLedger();
            assert(finalRecoveredB.length === 4, `Follower B should now have caught up to 4 blocks, has ${finalRecoveredB.length}`);
            assert(finalRecoveredB[2].hash === block2.hash, 'Follower B second block match');
            assert(finalRecoveredB[3].hash === block3.hash, 'Follower B third block match');
            assert(finalRecoveredB.length > 0, 'Follower B WAL is not empty');

            logger.info('  ✅ PASS: Anti-entropy protocol successfully synchronized missing blocks and certified local integrity');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 3');
            console.error(e);
        }

        // ─── Scenario 4: Epoch Fencing Rejection ───
        total++;
        logger.info('❌ [Scenario 4] Verifying follower replication rejection on stale epoch fences...');
        try {
            // Formulate stale append entries payload
            const staleBlock = {
                sequence: 5,
                prevHash: walB.recoverLedger()[walB.recoverLedger().length - 1].hash,
                timestamp: Date.now(),
                payload: { rogue: 'data' },
                hash: 'stalehash123',
                checksum: 'checksum123'
            };

            const appendRes = await agentB.handleAppendEntries({
                epoch: activeEpoch - 1, // Stale epoch presentation
                block: staleBlock,
                leaderId: 'node-a'
            });

            assert(appendRes.success === false, 'Follower must reject stale epoch replication request');
            assert(appendRes.errorReason?.includes('Stale epoch'), `Expected stale epoch reason, got: ${appendRes.errorReason}`);

            logger.info('  ✅ PASS: Stale epochs successfully fenced off, neutralizing obsolete leaders');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 4');
            console.error(e);
        }

        // ─── Scenario 5: Durable Replay Convergence ───
        total++;
        logger.info('🔄 [Scenario 5] Verifying durable recovery and deterministic convergence of replayed state...');
        try {
            // Close Follower B's active segment to simulate crash shutdown
            agentB.getLocalWAL().closeActiveSegment();

            // Re-instantiate Follower WAL from its log directory (crash restart)
            const recoveredWal = new DurableSegmentedWal<any>({ walDir: dirB, syncEveryWrite: true });
            const replayedBlocks = recoveredWal.recoverLedger();

            assert(replayedBlocks.length === 4, `Expected 4 recovered blocks on reboot, got ${replayedBlocks.length}`);
            
            // Assert JCS-canonical and SHA-256 equivalent values
            const blocksA = walA.recoverLedger();
            for (let i = 0; i < 4; i++) {
                assert(replayedBlocks[i].hash === blocksA[i].hash, `Block ${i+1} hash convergence mismatch`);
                assert(canonicalizeJson(replayedBlocks[i].payload) === canonicalizeJson(blocksA[i].payload), `Block ${i+1} JCS payload mismatch`);
            }

            recoveredWal.closeActiveSegment();
            logger.info('  ✅ PASS: Restart-time recovery and replay converged to identical cryptographic state');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 5');
            console.error(e);
        }

        // Cleanup
        leaseManagerA.releaseLeadership();
        walA.closeActiveSegment();
        walB.closeActiveSegment();
        walC.closeActiveSegment();
        this.cleanTestDir();

        logger.info(`🏁 [TEST] COMPLETED: ${passed}/${total} Scenarios Passed.`);
        if (passed !== total) {
            throw new Error(`Follower Replication Integration Test Failed: only ${passed}/${total} passed.`);
        }
        logger.info('🎉 [SYSTEM REPLICATION SECURE] Replication broadcast, quorum validation, anti-entropy recovery, and epoch fences are fully verified.');
    }
}

function assert(condition: any, message: string) {
    if (!condition) {
        console.error(`❌ FAILED: ${message}`);
        throw new Error(message);
    } else {
        console.log(`  PASSED: ${message}`);
    }
}

const tester = new ReplicationQuorumTester();
tester.run()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Fatal replication test failure:', err.message);
        process.exit(1);
    });
