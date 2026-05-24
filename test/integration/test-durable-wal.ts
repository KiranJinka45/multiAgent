import * as fs from 'node:fs';
import * as path from 'node:path';
import crypto from 'node:crypto';
import { 
    DurableSegmentedWal, 
    AtomicSnapshotStore, 
    WALCorruptException,
    canonicalizeJson
} from '../../packages/production-pilot/src/index.js';
import { logger } from '../../packages/observability/src/index.js';

class DurableWalTester {
    private testDir = path.join(process.cwd(), '.ztan', 'test-wal-' + Math.random().toString(36).substr(2, 9));

    private cleanTestDir() {
        if (fs.existsSync(this.testDir)) {
            fs.rmSync(this.testDir, { recursive: true, force: true });
        }
    }

    async run() {
        logger.info('🏁 [TEST] Starting PHASE K: DURABLE WAL SUBSYSTEM & CRASH CONSISTENCY TEST CAMPAIGN');
        let passed = 0;
        let total = 0;

        // Ensure clean state
        this.cleanTestDir();

        // ─── Scenario 1: Segmented Log Rotation ───
        total++;
        logger.info('📂 [Scenario 1] Verifying segmented log rotation on size thresholds...');
        try {
            const config = {
                walDir: path.join(this.testDir, 'scenario1'),
                maxSegmentSizeBytes: 180, // Very small to trigger immediate rotation
                syncEveryWrite: true
            };
            const wal = new DurableSegmentedWal<any>(config);

            // Write blocks that will exceed 180 bytes in total serialized form
            const block1 = wal.append({ msg: 'First event payload in WAL segment zero' });
            const block2 = wal.append({ msg: 'Second event payload in WAL segment one' });
            const block3 = wal.append({ msg: 'Third event payload in WAL segment two' });

            wal.closeActiveSegment();

            // Verify files exist in walDir
            const files = fs.readdirSync(config.walDir)
                .filter(f => f.startsWith('segment_') && f.endsWith('.log'))
                .sort();

            assert(files.length > 1, `Expected multiple segment files, found: ${files.join(', ')}`);
            logger.info(`  Generated segments: ${files.join(', ')}`);

            // Recover and verify they are all returned correctly
            const walRecover = new DurableSegmentedWal<any>(config);
            const recovered = walRecover.recoverLedger();
            assert(recovered.length === 3, `Expected 3 recovered blocks, got ${recovered.length}`);
            assert(recovered[0].hash === block1.hash, 'Block 1 hash match');
            assert(recovered[1].hash === block2.hash, 'Block 2 hash match');
            assert(recovered[2].hash === block3.hash, 'Block 3 hash match');

            walRecover.closeActiveSegment();
            logger.info('  ✅ PASS: Segmented log rotation successfully rotates active segments and recovers logs');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 1');
            console.error(e);
        }

        // ─── Scenario 2: Checksum Verification & Bit-Rot Detection ───
        total++;
        logger.info('🛡️  [Scenario 2] Verifying checksum and bit-rot mutation detection...');
        try {
            const config = {
                walDir: path.join(this.testDir, 'scenario2'),
                maxSegmentSizeBytes: 1024 * 1024,
                syncEveryWrite: true
            };
            const wal = new DurableSegmentedWal<any>(config);
            wal.append({ value: 100 });
            wal.append({ value: 200 });
            wal.closeActiveSegment();

            // Manually corrupt the payload of the first block in the segment file
            const files = fs.readdirSync(config.walDir).filter(f => f.endsWith('.log'));
            const filePath = path.join(config.walDir, files[0]);
            let content = fs.readFileSync(filePath, 'utf8');
            
            // Modify a value to cause checksum mismatch
            content = content.replace('"value":100', '"value":999');
            fs.writeFileSync(filePath, content, 'utf8');

            // Attempt to recover
            const corruptWal = new DurableSegmentedWal<any>(config);
            let threwCorrupt = false;
            try {
                corruptWal.recoverLedger();
            } catch (err: any) {
                if (err instanceof WALCorruptException && err.message.includes('Checksum verification failed')) {
                    threwCorrupt = true;
                    logger.info(`  Caught expected checksum mismatch: ${err.message}`);
                } else {
                    logger.error(`  Caught unexpected error: ${err.message}`);
                }
            }
            assert(threwCorrupt === true, 'Recovery must fail with WALCorruptException on payload mutation');

            corruptWal.closeActiveSegment();
            logger.info('  ✅ PASS: Bit-rot payload modification successfully detected, preventing corrupted startup');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 2');
            console.error(e);
        }

        // ─── Scenario 3: Crash Recovery Truncation ───
        total++;
        logger.info('🩹 [Scenario 3] Verifying trailing partial write truncation on recovery...');
        try {
            const config = {
                walDir: path.join(this.testDir, 'scenario3'),
                maxSegmentSizeBytes: 1024 * 1024,
                syncEveryWrite: true
            };
            const wal = new DurableSegmentedWal<any>(config);
            wal.append({ key: 'a' });
            wal.append({ key: 'b' });
            wal.closeActiveSegment();

            // Append an incomplete JSON line manually to simulate a crash mid-write
            const files = fs.readdirSync(config.walDir).filter(f => f.endsWith('.log'));
            const filePath = path.join(config.walDir, files[0]);
            fs.appendFileSync(filePath, '{"sequence":3,"prevHash":"somehash","timestamp":123456,"payload":{"key":\n', 'utf8');

            // Attempt recovery
            const recoveryWal = new DurableSegmentedWal<any>(config);
            const recovered = recoveryWal.recoverLedger();

            // Verify only the 2 complete events were restored and the active segment was truncated/repaired
            assert(recovered.length === 2, `Expected 2 recovered events, got ${recovered.length}`);
            assert(recovered[0].payload.key === 'a', 'First payload recovered');
            assert(recovered[1].payload.key === 'b', 'Second payload recovered');

            // Verify we can resume writing on the repaired WAL
            const block3 = recoveryWal.append({ key: 'c' });
            assert(block3.sequence === 3, `Expected sequence 3, got ${block3.sequence}`);

            recoveryWal.closeActiveSegment();

            // Verify final recovery includes the third element
            const finalWal = new DurableSegmentedWal<any>(config);
            const finalRecovered = finalWal.recoverLedger();
            assert(finalRecovered.length === 3, `Expected 3 recovered events, got ${finalRecovered.length}`);
            assert(finalRecovered[2].payload.key === 'c', 'Third payload successfully recovered');

            finalWal.closeActiveSegment();
            logger.info('  ✅ PASS: Malformed trailing writes are successfully truncated and appends resume seamlessly');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 3');
            console.error(e);
        }

        // ─── Scenario 4: Atomic Snapshot Commits ───
        total++;
        logger.info('💾 [Scenario 4] Verifying atomic snapshot store write-rename boundaries...');
        try {
            const snapDir = path.join(this.testDir, 'scenario4');
            fs.mkdirSync(snapDir, { recursive: true });

            const store = new AtomicSnapshotStore(snapDir, 'state.json');

            // 1. Write an initial valid snapshot
            const snapshot1 = {
                sequence: 10,
                stateHash: 'hash10',
                state: { database: 'v1', counter: 42 }
            };
            store.writeSnapshotAtomically(snapshot1);

            const read1 = store.readSnapshot<any>();
            assert(read1 !== null, 'Snapshot must be readable');
            assert(read1!.sequence === 10, 'Snapshot sequence match');
            assert(read1!.state.counter === 42, 'Snapshot state match');

            // 2. Simulate partial write of a temporary file to check isolation
            const tempFile = path.join(snapDir, 'state.json.tmp');
            fs.writeFileSync(tempFile, '{"sequence":11,"stateHash":"hash11","state":{partialJSON...', 'utf8');

            // Read snapshot again; it must read the uncorrupted state.json file
            const read2 = store.readSnapshot<any>();
            assert(read2 !== null, 'Snapshot must still be readable');
            assert(read2!.sequence === 10, 'Snapshot must remain uncorrupted by partial temp files');

            // 3. Write a new valid snapshot atomically
            const snapshot2 = {
                sequence: 12,
                stateHash: 'hash12',
                state: { database: 'v2', counter: 100 }
            };
            store.writeSnapshotAtomically(snapshot2);

            const read3 = store.readSnapshot<any>();
            assert(read3 !== null, 'New snapshot must be readable');
            assert(read3!.sequence === 12, 'New snapshot sequence match');
            assert(read3!.state.counter === 100, 'New snapshot state match');

            // Temporary file should no longer be present or corrupted
            assert(!fs.existsSync(tempFile) || fs.readFileSync(tempFile, 'utf8') !== '{"sequence":11,"stateHash":"hash11","state":{partialJSON...', 'Temporary file should be replaced/deleted on success');

            logger.info('  ✅ PASS: AtomicSnapshotStore successfully isolates partial writes and replaces checkpoints atomically');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 4');
            console.error(e);
        }

        // ─── Scenario 5: Durable Event-Store Integration ───
        total++;
        logger.info('🔗 [Scenario 5] Testing DurableSegmentedWal integration & event chain equivalence...');
        try {
            const config = {
                walDir: path.join(this.testDir, 'scenario5'),
                maxSegmentSizeBytes: 1024 * 1024,
                syncEveryWrite: true
            };
            const wal = new DurableSegmentedWal<any>(config);

            const block1 = wal.append({ txId: 'tx-001', amount: 500 });
            const block2 = wal.append({ txId: 'tx-002', amount: -250 });

            // Verify JCS equivalence / deterministic formatting of payloads
            const block1Data = {
                sequence: block1.sequence,
                prevHash: block1.prevHash,
                timestamp: block1.timestamp,
                payload: block1.payload
            };
            const localHash = crypto.createHash('sha256').update(canonicalizeJson(block1Data)).digest('hex');
            assert(block1.hash === localHash, 'Block hash must be JCS-canonicalized equivalent');

            wal.closeActiveSegment();

            // Recover and verify identity chain
            const verifyWal = new DurableSegmentedWal<any>(config);
            const recovered = verifyWal.recoverLedger();
            
            assert(recovered.length === 2, 'Must recover exactly 2 integrated blocks');
            assert(recovered[0].payload.txId === 'tx-001', 'First transaction ID match');
            assert(recovered[1].payload.txId === 'tx-002', 'Second transaction ID match');
            assert(recovered[1].prevHash === recovered[0].hash, 'Hash chain continuity matched');

            verifyWal.closeActiveSegment();
            logger.info('  ✅ PASS: Durable WAL seamlessly integrates with block serialization formats & deterministic replay constraints');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 5');
            console.error(e);
        }

        // Clean up test directories
        this.cleanTestDir();

        logger.info(`🏁 [TEST] COMPLETED: ${passed}/${total} Scenarios Passed.`);
        if (passed !== total) {
            throw new Error(`Durable WAL Integration Test Failed: only ${passed}/${total} passed.`);
        }
        logger.info('🎉 [SYSTEM DURABILITY SECURE] Segmented log rotation, payload checksums, crash recovery truncation, and atomic snapshots are fully verified.');
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

const tester = new DurableWalTester();
tester.run()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Fatal durable WAL test failure:', err.message);
        process.exit(1);
    });
