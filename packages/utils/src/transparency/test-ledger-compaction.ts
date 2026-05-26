import { GovernanceLedger } from '../governance-ledger.js';
import { db } from '@packages/db';
import * as fs from 'node:fs';
import * as path from 'node:path';

async function runLedgerCompactionValidation() {
  console.log("=========================================================================");
  console.log("  ZTAN v1.5.0 Snapshot Compaction & Replay Hardening Validation Suite   ");
  console.log("=========================================================================");

  // 1. Pristine reset
  console.log('[RESET] Setting up pristine database and filesystem environment...');
  await db.$executeRawUnsafe(`TRUNCATE TABLE "ZtanLedgerBlock", "ZtanWalLog", "ZtanSnapshot", "ZtanActiveLease", "ZtanPayloadAttestation", "ZtanQuarantineBlob", "IdempotencyRecord", "AuditLog" RESTART IDENTITY CASCADE;`);
  
  const ledgerDir = path.join(process.cwd(), '.ztan-transparency');
  if (fs.existsSync(ledgerDir)) {
    fs.rmSync(ledgerDir, { recursive: true, force: true });
  }

  // 2. Initialize
  console.log('[TEST] Initializing Governance Ledger...');
  GovernanceLedger.init();

  const LOCK_FILE = GovernanceLedger.getLockFile(0);

  // Wait robustly for any background initialization/sync (e.g. initDbSync, processOutbox) to fully complete
  console.log('[TEST] Waiting for background sync and lock release to complete...');
  let syncSettled = false;
  for (let i = 0; i < 150; i++) {
    const lockExists = fs.existsSync(LOCK_FILE);
    const outboxStatus = GovernanceLedger.getOutboxStatus();
    const state = GovernanceLedger.getState(0);
    if ((state === 'ACTIVE' || state === 'DEGRADED') && !lockExists && outboxStatus.synchronized) {
      syncSettled = true;
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  if (!syncSettled) {
    console.error('[FAIL] Background sync did not settle within timeout.');
    process.exit(1);
  }

  // Stop background timers to prevent background sync/heartbeat interfering with the manual multi-writer chaos simulation
  GovernanceLedger.stopBackgroundTasks();

  // 3. Append 5 blocks to build the chain
  console.log('[TEST] Appending 5 cryptographically chained blocks to the ledger...');
  const payloads = [
    'ZTAN-BLOCK-01: Policy update A',
    'ZTAN-BLOCK-02: Telemetry event B',
    'ZTAN-BLOCK-03: Key rotation C',
    'ZTAN-BLOCK-04: Operator session D',
    'ZTAN-BLOCK-05: Heartbeat update E'
  ];

  const appended: any[] = [];
  for (let i = 0; i < payloads.length; i++) {
    const entry = await GovernanceLedger.appendEntry('POLICY', payloads[i], 'ZTAN-OPERATOR-01', 'VERIFIED', '105');
    appended.push(entry);
    console.log(`  - Appended block sequence ${entry.sequenceId} (Hash: ${entry.hash})`);
  }

  const initialLedger = GovernanceLedger.loadLedger();
  console.log(`  - Initial Ledger local size: ${initialLedger.length} blocks (Genesis 1000 + 5 appends).`);

  // 4. Wait for full Postgres synchronization
  console.log('[TEST] Waiting for replication parity with PostgreSQL consensus storage...');
  let settled = false;
  const localCount = initialLedger.length;
  const EXPECTED_TOTAL = localCount;
  for (let i = 0; i < 50; i++) {
    const allDbBlocks = await db.ztanLedgerBlock.findMany().catch(() => []);
    const dbCount = allDbBlocks.filter((b: any) => !isNaN(parseInt(b.blockId, 10))).length;
    console.log(`  - Checking parity: Local size = ${localCount}, PostgreSQL size = ${dbCount} (Expected: ${EXPECTED_TOTAL})`);
    if (dbCount === EXPECTED_TOTAL) {
      settled = true;
      console.log(`  - Replicated! PostgreSQL settled with ${dbCount} blocks.`);
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  if (!settled) {
    console.error('[FAIL] Postgres consensus storage did not achieve parity.');
    process.exit(1);
  }

  // Verify full ledger is valid before compaction
  const initialAudit = GovernanceLedger.verifyLedger();
  console.log(`  - Pre-compaction ledger validation outcome: ${initialAudit.valid ? '✅ VALID' : '❌ INVALID'}`);
  if (!initialAudit.valid) {
    console.error(`[FAIL] Ledger was initially corrupted: ${initialAudit.error}`);
    process.exit(1);
  }

  // 5. Execute Compaction (Keep sliding window of 3 recent blocks)
  console.log('\n[TEST] Executing compactLedger(3) to truncate historical blocks...');
  await GovernanceLedger.compactLedger(3);

  const compactedLedger = GovernanceLedger.loadLedger();
  console.log(`  - Compacted local ledger size: ${compactedLedger.length} blocks.`);
  console.log(`  - First block in compacted ledger (Snapshot Anchor): sequence ${compactedLedger[0].sequenceId}`);
  console.log(`  - Last block in compacted ledger: sequence ${compactedLedger[compactedLedger.length - 1].sequenceId}`);

  // Assert compaction correctly pruned history
  if (compactedLedger.length >= initialLedger.length) {
    console.error('[FAIL] Compaction did not prune any historical blocks.');
    process.exit(1);
  }
  console.log('  - ✅ PASS: Compacted local ledger size reduced successfully.');

  // 6. Cryptographic Chain Validation over the sliding window
  console.log('\n[TEST] Verifying cryptographic chain validity over compacted sliding window...');
  const compactAudit = GovernanceLedger.verifyLedger();
  console.log(`  - Compacted ledger validation outcome: ${compactAudit.valid ? '✅ VALID' : '❌ INVALID'}`);
  if (!compactAudit.valid) {
    console.error(`[FAIL] Compacted ledger verification failed: ${compactAudit.error}`);
    process.exit(1);
  }
  console.log('  - ✅ PASS: Compacted sliding window validated perfectly with full cryptographic checks.');

  // 7. Inject Mutation to Verify Tamper-Resistance over compacted range
  console.log('\n[TEST] Injecting block payload mutation to confirm ongoing tamper-resistance...');
  const targetEntry = compactedLedger[2]; // Target sequence 1004
  const originalPayload = targetEntry.payload;
  targetEntry.payload = 'ZTAN-BLOCK-04: Operator session D [MUTATED BY ADVERSARY]';
  
  // Temporarily bypass saveLedger swap to write the mutation directly
  const outboxFilePath = path.join(ledgerDir, 'governance_ledger.json');
  fs.writeFileSync(outboxFilePath, JSON.stringify(compactedLedger, null, 2), 'utf8');
  console.log(`  - Mutated payload of block ${targetEntry.sequenceId} directly in governance_ledger.json.`);

  const corruptedAudit = GovernanceLedger.verifyLedger();
  console.log(`  - Corrupted compacted ledger validation outcome: ${corruptedAudit.valid ? '✅ VALID' : '❌ INVALID'}`);
  console.log(`  - Detected error message: "${corruptedAudit.error}"`);
  if (corruptedAudit.valid) {
    console.error('[FAIL] Chain verification did not catch the block payload mutation!');
    process.exit(1);
  }
  console.log('  - ✅ PASS: Tamper-resistance fully operational over the compacted range!');

  console.log("\n=========================================================================");
  console.log("✅ ZTAN Snapshot Compaction & Replay Hardening Validation PASSED.");
  console.log("=========================================================================");
  process.exit(0);
}

runLedgerCompactionValidation().catch((err) => {
  console.error('[FAIL] Critical failure in compaction validation:', err);
  process.exit(1);
});
