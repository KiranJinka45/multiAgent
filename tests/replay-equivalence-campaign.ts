process.env.ZTAN_PARTITIONS = '1';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { GovernanceLedger, GovernanceLedgerEntry } from '../packages/utils/src/governance-ledger.js';
import { db, injectDbOutage, clearDbOutage } from '../packages/db/src/index.js';
import { logger } from '../packages/observability/src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '../');

// Mocks for deterministic execution during the equivalence test
let currentForcedTimestamp: string | null = null;
const originalToISOString = Date.prototype.toISOString;
Date.prototype.toISOString = function() {
    if (currentForcedTimestamp) {
        const err = new Error();
        if (err.stack && (err.stack.includes('appendEntry') || err.stack.includes('createGenesisEntry'))) {
            return currentForcedTimestamp;
        }
    }
    return originalToISOString.call(this);
};

// Mock signature to be deterministic in test
GovernanceLedger.signPayload = (payload: string): string => {
    return crypto.createHash('sha256').update(payload + '_mock_sig').digest('base64');
};

GovernanceLedger.verifySignature = (payload: string, signatureBase64: string): boolean => {
    const expected = crypto.createHash('sha256').update(payload + '_mock_sig').digest('base64');
    return signatureBase64 === expected;
};

GovernanceLedger.verifySignatureWithKey = (payload: string, signatureBase64: string, publicKeyPem: string): boolean => {
    const expected = crypto.createHash('sha256').update(payload + '_mock_sig').digest('base64');
    return signatureBase64 === expected;
};

interface RecordedCall {
    type: any;
    payload: string;
    operatorId: string;
    verdict: any;
    epoch: string;
    correlationId: string;
    correlationMetadata: any;
    timestamp: string;
}

class ReplayEquivalenceTester {
    private partition = 0;
    private ledgerDir = path.join(workspaceRoot, '.ztan-transparency');
    private backupLedgerFile = path.join(workspaceRoot, '.ztan-transparency', 'ledger_backup.json');
    private recordedCalls: RecordedCall[] = [];

    async run() {
        console.log('================================================================================');
        console.log('🧪  ZTAN REPLAY EQUIVALENCE TESTING CAMPAIGN');
        console.log('================================================================================\n');

        process.env.MOCK_DB = 'false';

        // 1. Reset state
        await this.resetState();

        // 2. Generate 10 baseline writes
        console.log('⚡ [STEP 1] Generating 10 baseline writes...');
        const baselineTx = await this.generateTransactions(10);
        console.log(`   - Generated ${baselineTx.length} baseline transactions.`);

        // 3. Take Checkpoint
        console.log('⚡ [STEP 2] Capturing checkpoint state...');
        const checkpointBlocks = await db.ztanLedgerBlock.findMany({ orderBy: { id: 'asc' } });
        const checkpointWal = await db.ztanWalLog.findMany({ orderBy: { seq: 'asc' } });
        const checkpointFileContent = fs.readFileSync(path.join(this.ledgerDir, 'governance_ledger.json'), 'utf8');

        // 4. Run Interrupted Workload (Run 1)
        console.log('⚡ [STEP 3] Running interrupted workload (injecting database outage)...');
        
        // Start second batch
        const nextBatchCount = 10;
        const targetStatePromise = this.runInterruptedBatch(nextBatchCount);

        // Wait for it to complete
        const interruptedResults = await targetStatePromise;
        console.log(`   - Completed ${interruptedResults.length} transactions with interruption recovery.`);

        // Gather final state of Run 1
        const run1Blocks = await db.ztanLedgerBlock.findMany({ orderBy: { id: 'asc' } });
        const run1Wal = await db.ztanWalLog.findMany({ orderBy: { seq: 'asc' } });
        const run1FileContent = fs.readFileSync(path.join(this.ledgerDir, 'governance_ledger.json'), 'utf8');

        // 5. Restore Checkpoint for Replay (Run 2)
        console.log('⚡ [STEP 4] Restoring checkpoint for pristine replay...');
        await this.restoreCheckpoint(checkpointBlocks, checkpointWal, checkpointFileContent);

        // 6. Run Pristine Replay (Run 2)
        console.log('⚡ [STEP 5] Running pristine replay workload (nominal conditions)...');
        const pristineResults = await this.runPristineBatch();
        console.log(`   - Completed ${pristineResults.length} replayed transactions.`);

        // Gather final state of Run 2
        const run2Blocks = await db.ztanLedgerBlock.findMany({ orderBy: { id: 'asc' } });
        const run2Wal = await db.ztanWalLog.findMany({ orderBy: { seq: 'asc' } });
        const run2FileContent = fs.readFileSync(path.join(this.ledgerDir, 'governance_ledger.json'), 'utf8');

        // 7. Verify Equivalence (Diff States)
        console.log('⚡ [STEP 6] Diffing final states for semantic equivalence...');
        
        let equivalenceFailed = false;

        // A. Assert DB Ledger Block equivalence
        if (run1Blocks.length !== run2Blocks.length) {
            console.error(`   ❌ FAIL: Block count mismatch! Run 1 (Interrupted) has ${run1Blocks.length} blocks, Run 2 (Pristine) has ${run2Blocks.length} blocks.`);
            equivalenceFailed = true;
        } else {
            console.log(`   ✔ Block counts match: ${run1Blocks.length} blocks.`);
            
            // Diff block hashes and sequence IDs
            for (let i = 0; i < run1Blocks.length; i++) {
                const b1 = run1Blocks[i];
                const b2 = run2Blocks[i];
                if (b1.blockId !== b2.blockId || b1.hash !== b2.hash || b1.prevHash !== b2.prevHash || b1.epoch !== b2.epoch) {
                    console.error(`   ❌ FAIL: Block mismatch at index ${i}!`);
                    console.error(`      Run 1: blockId=${b1.blockId}, hash=${b1.hash?.substring(0, 10)}, prevHash=${b1.prevHash?.substring(0, 10)}, epoch=${b1.epoch}`);
                    console.error(`      Run 2: blockId=${b2.blockId}, hash=${b2.hash?.substring(0, 10)}, prevHash=${b2.prevHash?.substring(0, 10)}, epoch=${b2.epoch}`);
                    equivalenceFailed = true;
                }
            }
        }

        // B. Assert File-System Ledger equivalence
        const ledger1 = JSON.parse(run1FileContent) as GovernanceLedgerEntry[];
        const ledger2 = JSON.parse(run2FileContent) as GovernanceLedgerEntry[];

        if (ledger1.length !== ledger2.length) {
            console.error(`   ❌ FAIL: Local file ledger entry count mismatch! Run 1 has ${ledger1.length}, Run 2 has ${ledger2.length}.`);
            equivalenceFailed = true;
        } else {
            console.log(`   ✔ Local file ledger entry counts match: ${ledger1.length} entries.`);
            for (let i = 0; i < ledger1.length; i++) {
                const e1 = ledger1[i];
                const e2 = ledger2[i];
                if (e1.sequenceId !== e2.sequenceId || e1.hash !== e2.hash || e1.prevHash !== e2.prevHash) {
                    console.error(`   ❌ FAIL: Local file entry mismatch at index ${i}!`);
                    equivalenceFailed = true;
                }
            }
        }

        if (equivalenceFailed) {
            console.error('\n❌ REPLAY EQUIVALENCE TEST FAILED! Semantic state drift detected.');
            process.exit(1);
        } else {
            console.log('\n🎉 REPLAY EQUIVALENCE TEST PASSED SUCCESSFULLY!');
            console.log('   Zero semantic state drift verified between interrupted/healed and pristine runs.');
            process.exit(0);
        }
    }

    private async resetState() {
        console.log('🧹 Cleaning up database tables and ledger partition files...');
        try {
            await db.$executeRawUnsafe(`TRUNCATE TABLE "ZtanLedgerBlock" RESTART IDENTITY CASCADE;`);
            await db.$executeRawUnsafe(`TRUNCATE TABLE "ZtanWalLog" RESTART IDENTITY CASCADE;`);
            await db.$executeRawUnsafe(`TRUNCATE TABLE "ZtanRegisteredKey" RESTART IDENTITY CASCADE;`);
            await db.$executeRawUnsafe(`TRUNCATE TABLE "IdempotencyRecord" RESTART IDENTITY CASCADE;`);
            await db.$executeRawUnsafe(`TRUNCATE TABLE "ZtanActiveLease" RESTART IDENTITY CASCADE;`);
            await db.$executeRawUnsafe(`TRUNCATE TABLE "AuditLog" RESTART IDENTITY CASCADE;`);
        } catch (e: any) {
            console.warn(`Database cleanup warning: ${e.message}`);
        }

        if (fs.existsSync(this.ledgerDir)) {
            const files = fs.readdirSync(this.ledgerDir);
            for (const file of files) {
                try {
                    fs.unlinkSync(path.join(this.ledgerDir, file));
                } catch {}
            }
        }

        GovernanceLedger.initPartition(this.partition);
        await new Promise(resolve => setTimeout(resolve, 3000));
    }

    private async restoreCheckpoint(blocks: any[], wal: any[], fileContent: string) {
        await this.resetState();
        
        // Restore database blocks (only if they don't already exist)
        const existingBlocks = await db.ztanLedgerBlock.findMany({ select: { blockId: true } });
        const existingBlockIds = new Set(existingBlocks.map((b: any) => b.blockId));

        for (const b of blocks) {
            if (existingBlockIds.has(b.blockId)) {
                continue;
            }
            const { id, ...rest } = b;
            await db.ztanLedgerBlock.create({
                data: rest
            });
        }

        // Restore WAL logs (only if they don't already exist)
        const existingWal = await db.ztanWalLog.findMany({ select: { seq: true } });
        const existingWalSeqs = new Set(existingWal.map((w: any) => w.seq));

        for (const w of wal) {
            if (existingWalSeqs.has(w.seq)) {
                continue;
            }
            const { id, ...rest } = w;
            await db.ztanWalLog.create({
                data: rest
            });
        }

        // Restore local ledger file
        fs.writeFileSync(path.join(this.ledgerDir, 'governance_ledger.json'), fileContent, 'utf8');
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    private async generateTransactions(count: number): Promise<GovernanceLedgerEntry[]> {
        const results: GovernanceLedgerEntry[] = [];
        for (let i = 0; i < count; i++) {
            const requestUuid = `11111111-1111-4111-8111-${String(i).padStart(12, '0')}`;
            const payload = `Transaction payload baseline index ${i}`;
            
            // Deterministic timestamp for baseline writes
            currentForcedTimestamp = `2026-05-28T12:00:${String(i).padStart(2, '0')}.000Z`;
            
            const entry = await GovernanceLedger.appendEntry('GOVERNANCE', payload, 'ZTAN-OPERATOR-01', 'VERIFIED', '102', requestUuid, {
                requestUuid,
                auditUuid: `22222222-2222-4222-8222-${String(i).padStart(12, '0')}`,
                outboxUuid: `33333333-3333-4333-8333-${String(i).padStart(12, '0')}`,
                ledgerBlockUuid: `44444444-4444-4444-8444-${String(i).padStart(12, '0')}`
            });
            results.push(entry);
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        currentForcedTimestamp = null;
        return results;
    }

    private async runInterruptedBatch(count: number): Promise<GovernanceLedgerEntry[]> {
        const results: GovernanceLedgerEntry[] = [];
        this.recordedCalls = [];
        
        // Run first 3 mutations normally
        for (let i = 0; i < 3; i++) {
            const requestUuid = `aaaaaaaa-aaaa-4aaa-8aaa-${String(i).padStart(12, '0')}`;
            const payload = `Replayed payload batch index ${i}`;
            const correlationMetadata = {
                requestUuid,
                auditUuid: `bbbbbbbb-bbbb-4bbb-8bbb-${String(i).padStart(12, '0')}`,
                outboxUuid: `cccccccc-cccc-4ccc-8ccc-${String(i).padStart(12, '0')}`,
                ledgerBlockUuid: `dddddddd-dddd-4ddd-8ddd-${String(i).padStart(12, '0')}`
            };
            
            currentForcedTimestamp = `2026-05-28T13:00:${String(i).padStart(2, '0')}.000Z`;
            
            const entry = await GovernanceLedger.appendEntry('GOVERNANCE', payload, 'ZTAN-OPERATOR-01', 'VERIFIED', '102', requestUuid, correlationMetadata);
            results.push(entry);
            
            this.recordedCalls.push({
                type: 'GOVERNANCE',
                payload,
                operatorId: 'ZTAN-OPERATOR-01',
                verdict: 'VERIFIED',
                epoch: '102',
                correlationId: requestUuid,
                correlationMetadata,
                timestamp: currentForcedTimestamp
            });
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Inject database outage
        console.log('   [Outage] Injecting database pool outage...');
        injectDbOutage(2000, 'pool');

        // Run next 4 mutations (expected to write to local outbox files)
        for (let i = 3; i < 7; i++) {
            const requestUuid = `aaaaaaaa-aaaa-4aaa-8aaa-${String(i).padStart(12, '0')}`;
            const payload = `Replayed payload batch index ${i}`;
            const correlationMetadata = {
                requestUuid,
                auditUuid: `bbbbbbbb-bbbb-4bbb-8bbb-${String(i).padStart(12, '0')}`,
                outboxUuid: `cccccccc-cccc-4ccc-8ccc-${String(i).padStart(12, '0')}`,
                ledgerBlockUuid: `dddddddd-dddd-4ddd-8ddd-${String(i).padStart(12, '0')}`
            };
            
            currentForcedTimestamp = `2026-05-28T13:00:${String(i).padStart(2, '0')}.000Z`;
            
            try {
                const entry = await GovernanceLedger.appendEntry('GOVERNANCE', payload, 'ZTAN-OPERATOR-01', 'VERIFIED', '102', requestUuid, correlationMetadata);
                results.push(entry);
                
                this.recordedCalls.push({
                    type: 'GOVERNANCE',
                    payload,
                    operatorId: 'ZTAN-OPERATOR-01',
                    verdict: 'VERIFIED',
                    epoch: '102',
                    correlationId: requestUuid,
                    correlationMetadata,
                    timestamp: currentForcedTimestamp
                });
            } catch (err) {
                // Outbox fallback creates the local ledger block but sets DB status as pending
                // So local ledger has it, but DB doesn't.
                // We recreate the return value signature for diff matching
                console.log(`   - Write index ${i} redirected to local outbox fallback.`);
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Clear database outage
        console.log('   [Outage] Database pool restored. Triggering reconciliation...');
        clearDbOutage();
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Trigger outbox self healing and wait for it to process
        await GovernanceLedger.triggerOutboxSelfHealing(this.partition);
        while (GovernanceLedger.loadOutbox(this.partition).length > 0) {
            await GovernanceLedger.processOutbox(this.partition);
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Run remaining 3 mutations normally
        for (let i = 7; i < count; i++) {
            const requestUuid = `aaaaaaaa-aaaa-4aaa-8aaa-${String(i).padStart(12, '0')}`;
            const payload = `Replayed payload batch index ${i}`;
            const correlationMetadata = {
                requestUuid,
                auditUuid: `bbbbbbbb-bbbb-4bbb-8bbb-${String(i).padStart(12, '0')}`,
                outboxUuid: `cccccccc-cccc-4ccc-8ccc-${String(i).padStart(12, '0')}`,
                ledgerBlockUuid: `dddddddd-dddd-4ddd-8ddd-${String(i).padStart(12, '0')}`
            };
            
            currentForcedTimestamp = `2026-05-28T13:00:${String(i).padStart(2, '0')}.000Z`;
            
            const entry = await GovernanceLedger.appendEntry('GOVERNANCE', payload, 'ZTAN-OPERATOR-01', 'VERIFIED', '102', requestUuid, correlationMetadata);
            results.push(entry);
            
            this.recordedCalls.push({
                type: 'GOVERNANCE',
                payload,
                operatorId: 'ZTAN-OPERATOR-01',
                verdict: 'VERIFIED',
                epoch: '102',
                correlationId: requestUuid,
                correlationMetadata,
                timestamp: currentForcedTimestamp
            });
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        currentForcedTimestamp = null;
        return results;
    }

    private async runPristineBatch(): Promise<GovernanceLedgerEntry[]> {
        const results: GovernanceLedgerEntry[] = [];
        for (const call of this.recordedCalls) {
            currentForcedTimestamp = call.timestamp;
            const entry = await GovernanceLedger.appendEntry(
                call.type,
                call.payload,
                call.operatorId,
                call.verdict,
                call.epoch,
                call.correlationId,
                call.correlationMetadata
            );
            results.push(entry);
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        currentForcedTimestamp = null;
        return results;
    }
}

new ReplayEquivalenceTester().run().catch(err => {
    console.error('Fatal tester error:', err);
    process.exit(1);
});
