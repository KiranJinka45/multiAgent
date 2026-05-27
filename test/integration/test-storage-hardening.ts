import * as fs from 'node:fs';
import * as path from 'node:path';
import crypto from 'node:crypto';
import {
    DurableSegmentedWal,
    TcpReplicationTransport,
    FollowerSyncAgent,
    ReplicatedWalCoordinator,
    AtomicSnapshotStore,
    WalCompactor,
    canonicalizeJson
} from '../../packages/production-pilot/src/index.js';
import { logger } from '../../packages/observability/src/index.js';

class StorageHardeningTester {
    private testDir = path.join(process.cwd(), 'scratch', 'test-storage-hardening-' + Math.random().toString(36).substr(2, 9));

    private cleanTestDir() {
        if (fs.existsSync(this.testDir)) {
            fs.rmSync(this.testDir, { recursive: true, force: true });
        }
    }

    async run() {
        logger.info('🏁 [TEST] Starting Phase Q: Storage & Replication Hardening Test');
        let passed = 0;
        let total = 0;

        this.cleanTestDir();
        const dirA = path.join(this.testDir, 'node-a');
        const dirB = path.join(this.testDir, 'node-b');

        fs.mkdirSync(dirA, { recursive: true });
        fs.mkdirSync(dirB, { recursive: true });

        // Leader WAL with tiny segments to force rotation
        const walA = new DurableSegmentedWal<any>({ 
            walDir: dirA, 
            maxSegmentSizeBytes: 100, // Small segments
            syncEveryWrite: true 
        });

        // ─── Scenario 1: WAL Compaction & Pruning ───
        total++;
        logger.info('💾 [Scenario 1] Verifying local WAL Compaction, segment pruning, and recovery...');
        try {
            // Append 5 blocks (each block is ~150 bytes, causing multiple segment files)
            walA.append({ payload: 'txn-1' });
            walA.append({ payload: 'txn-2' });
            walA.append({ payload: 'txn-3' });
            walA.append({ payload: 'txn-4' });
            const block5 = walA.append({ payload: 'txn-5' });

            const initialFiles = fs.readdirSync(dirA).filter(f => f.startsWith('segment_') && f.endsWith('.log'));
            assert(initialFiles.length >= 3, `Expected at least 3 segment files, got ${initialFiles.length}`);

            // Write snapshot at sequence 3
            const snapshotStoreA = new AtomicSnapshotStore(dirA);
            snapshotStoreA.writeSnapshotAtomically({
                sequence: 3,
                stateHash: 'state-hash-at-sequence-3',
                state: { data: 'snapshot-3' }
            });

            // Compact WAL
            const compactor = new WalCompactor(dirA);
            const { prunedSegments } = compactor.compact(3);
            assert(prunedSegments.length > 0, `Pruned segments list should not be empty, got ${prunedSegments.length}`);

            const remainingFiles = fs.readdirSync(dirA).filter(f => f.startsWith('segment_') && f.endsWith('.log'));
            assert(remainingFiles.length < initialFiles.length, `Obsolete segments should be deleted. Remaining: ${remainingFiles.length}`);

            // Recover and verify WAL successfully loads snapshot + active segments
            const recoveredBlocks = walA.recoverLedger();
            assert(recoveredBlocks.length === 2, `Ledger recovery should load 2 active blocks (txn-4, txn-5), got ${recoveredBlocks.length}`);
            assert(recoveredBlocks[0].sequence === 4, `First recovered block sequence should be 4, got ${recoveredBlocks[0].sequence}`);
            assert(recoveredBlocks[1].sequence === 5, `Second recovered block sequence should be 5, got ${recoveredBlocks[1].sequence}`);

            logger.info('  ✅ PASS: Local WAL Compaction & Snapshot Recovery verified');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Scenario 1');
        }

        // ─── Scenario 2: Replicated Snapshot Transfer over TCP ───
        total++;
        logger.info('🌐 [Scenario 2] Verifying Replicated Snapshot Transfer & Catch-up over TCP...');
        
        const portA = 48000 + Math.floor(Math.random() * 1000);
        const portB = portA + 1;

        const transportA = new TcpReplicationTransport('node-a', portA);
        const transportB = new TcpReplicationTransport('node-b', portB);

        transportA.addPeer('node-b', '127.0.0.1', portB);
        transportB.addPeer('node-a', '127.0.0.1', portA);

        await transportA.start();
        await transportB.start();

        const walB = new DurableSegmentedWal<any>({ walDir: dirB });
        const agentB = new FollowerSyncAgent<any>('node-b', walB);
        const coordinatorA = new ReplicatedWalCoordinator<any>('node-a', walA, transportA);

        // Register handlers for replication protocol
        transportA.registerNode('node-a', async (msg) => {
            if (msg.type === 'SYNC_REQUEST') {
                const responsePayload = coordinatorA.handleSyncRequest(msg.payload);
                return {
                    type: 'SYNC_RESPONSE',
                    senderId: 'node-a',
                    epoch: msg.epoch,
                    payload: responsePayload
                };
            }
            if (msg.type === 'SNAPSHOT_REQUEST') {
                const responsePayload = coordinatorA.handleSnapshotRequest();
                return {
                    type: 'SNAPSHOT_RESPONSE',
                    senderId: 'node-a',
                    epoch: msg.epoch,
                    payload: responsePayload
                };
            }
            throw new Error(`Unsupported message for node-a: ${msg.type}`);
        });

        transportB.registerNode('node-b', async (msg) => {
            if (msg.type === 'APPEND_ENTRIES') {
                const res = await agentB.handleAppendEntries(msg.payload);
                return {
                    type: 'APPEND_ENTRIES',
                    senderId: 'node-b',
                    epoch: msg.epoch,
                    payload: res
                };
            }
            throw new Error(`Unsupported message for node-b: ${msg.type}`);
        });

        try {
            // Follower B is empty (seq 0). Run sync. It should detect sequence gap and trigger Snapshot transfer.
            const caughtUp = await agentB.runAntiEntropySync('node-a', transportB);
            assert(caughtUp > 0, `Sync should return caught up blocks, got ${caughtUp}`);

            // Verify B's snapshot is written and active segments are loaded
            const snapshotStoreB = new AtomicSnapshotStore(dirB);
            const snapshotB = snapshotStoreB.readSnapshot<any>();
            assert(snapshotB !== null, 'Follower B should have applied the leader snapshot');
            assert(snapshotB.sequence === 3, `Follower snapshot sequence should match leader (3), got ${snapshotB.sequence}`);

            const blocksB = walB.recoverLedger();
            assert(blocksB.length === 2, `Follower B should recover 2 blocks after snapshot, got ${blocksB.length}`);
            assert(blocksB[0].sequence === 4, `Follower sequence matches`);

            // Verify subsequent live appends work
            coordinatorA.registerFollowers(['node-b']);
            const block6 = await coordinatorA.appendReplicated({ payload: 'txn-6' });
            assert(block6.sequence === 6, `Append sequence should progress to 6, got ${block6.sequence}`);

            // Let replication message reach B
            await new Promise(res => setTimeout(res, 100));

            const finalBlocksB = walB.recoverLedger();
            assert(finalBlocksB.length === 3, `Follower B should catch up on live write, total blocks: ${finalBlocksB.length}`);
            assert(finalBlocksB[2].payload.payload === 'txn-6', 'Follower block payload matches txn-6');

            logger.info('  ✅ PASS: Replicated Snapshot Transfer over TCP verified');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Scenario 2');
        }

        // Cleanup
        walA.closeActiveSegment();
        walB.closeActiveSegment();
        await transportA.stop();
        await transportB.stop();
        this.cleanTestDir();

        logger.info(`🏁 [TEST] COMPLETED: ${passed}/${total} Scenarios Passed.`);
        if (passed !== total) {
            throw new Error(`Storage Hardening Test Failed: only ${passed}/${total} passed.`);
        }
    }
}

function assert(condition: any, message: string) {
    if (!condition) {
        console.error(`❌ FAILED ASSERTION: ${message}`);
        throw new Error(message);
    }
}

const tester = new StorageHardeningTester();
tester.run()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Fatal storage hardening test failure:', err.message);
        process.exit(1);
    });
