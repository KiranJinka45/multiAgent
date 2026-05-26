import { GovernanceLedger } from '../governance-ledger.js';
import { db } from '@packages/db';
import * as fs from 'node:fs';
import * as path from 'node:path';

async function runByzantineDriftValidation() {
  console.log("=========================================================================");
  console.log("  ZTAN v1.5.0 Byzantine Drift & Parity Deduplication Validation Suite    ");
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

  // 3. Append legitimate entry
  console.log('[TEST] Appending a legitimate governance block entry...');
  const entry = await GovernanceLedger.appendEntry(
    'POLICY',
    'ZTAN-POLICY: Authenticated Operator list updated by Root Supervisor.',
    'ZTAN-SUPER-01',
    'VERIFIED',
    '105'
  );
  console.log(`  - Legitimate entry created (Seq: ${entry.sequenceId}). Hash: ${entry.hash}`);

  // Wait for background outbox reconciliation to write to DB
  console.log('[TEST] Waiting for block to replicate to PostgreSQL...');
  let replicated = false;
  for (let i = 0; i < 30; i++) {
    const existing = await db.ztanLedgerBlock.findUnique({
      where: { blockId: entry.sequenceId.toString() }
    });
    if (existing) {
      replicated = true;
      console.log(`  - Replicated! Found sequence ${entry.sequenceId} in PostgreSQL consensus storage.`);
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  if (!replicated) {
    console.error('[FAIL] Entry did not replicate to database.');
    process.exit(1);
  }

  // 4. Test Deduplication Idempotency (Hash Parity Matches)
  console.log('\n[TEST] Testing Deduplication Idempotency (Replaying same sequence with perfect parity)...');
  
  // Enqueue sequence ID 1001 back into outbox to simulate duplicates
  await GovernanceLedger.acquireLockAsync();
  try {
    const queue = GovernanceLedger.loadOutbox();
    queue.push(entry.sequenceId);
    GovernanceLedger.saveOutbox(queue);
  } finally {
    GovernanceLedger.releaseLock();
  }

  // Run outbox processor which should detect identical hash and deduplicate
  await GovernanceLedger.processOutbox();
  
  const postDeduplicateQueue = GovernanceLedger.loadOutbox();
  console.log(`  - Post-deduplicate Outbox Queue size: ${postDeduplicateQueue.length} (Expected: 0)`);
  if (postDeduplicateQueue.length !== 0) {
    console.error('[FAIL] Duplicate entry was not gracefully deduplicated.');
    process.exit(1);
  }
  console.log('  - ✅ PASS: Deduplication idempotent filter successfully processed duplicate queue item.');

  // 5. Test Byzantine Drift Protection (Simulate Database Row Tampered / Diverged Hash)
  console.log('\n[TEST] Simulating administrative superuser bypass / database timeline mutation (Byzantine Drift)...');
  
  const originalFindUnique = db.ztanLedgerBlock.findUnique;

  // Mock Prisma Client delegate to return mutated payload and hash
  (db.ztanLedgerBlock as any).findUnique = async () => {
    return {
      blockId: entry.sequenceId.toString(),
      prevHash: entry.prevHash,
      hash: '0xMALICIOUS_MUTATED_TIMELINE_HASH_DIVERGENCE_FF',
      type: entry.type,
      payload: 'ZTAN-POLICY: Authenticated Operator list updated. [INJECTED BY BYZANTINE MUTATION ATTACK]',
      operator: entry.operatorId,
      signature: entry.signature,
      status: 'VERIFIED',
      epoch: entry.epoch,
      createdAt: new Date(entry.timestamp)
    };
  };

  // Re-enqueue the block into the outbox queue
  await GovernanceLedger.acquireLockAsync();
  try {
    const outbox = GovernanceLedger.loadOutbox();
    outbox.push(entry.sequenceId);
    GovernanceLedger.saveOutbox(outbox);
  } finally {
    GovernanceLedger.releaseLock();
  }

  console.log('[TEST] Triggering Outbox reconciliation under active Byzantine Drift...');
  try {
    await GovernanceLedger.processOutbox(0);
    console.error('[FAIL] processOutbox did not catch the Byzantine Drift timeline fracture!');
    process.exit(1);
  } catch (err: any) {
    console.log(`  - Intercepted Exception: "${err.message}"`);
    if (err.message && err.message.includes('Byzantine Timeline Fracture')) {
      console.log('  - ✅ PASS: Byzantine Drift successfully blocked replication and aborted outbox worker!');
    } else {
      console.error('[FAIL] Aborted with unexpected error:', err);
      process.exit(1);
    }
  }

  // Restore Prisma Client delegates
  db.ztanLedgerBlock.findUnique = originalFindUnique;

  // Verify the block verdict was successfully degraded to UNTRUSTED
  const ledger = GovernanceLedger.loadLedger();
  const modifiedEntry = ledger.find(e => e.sequenceId === entry.sequenceId);
  console.log(`  - Authoritative local ledger block status: "${modifiedEntry?.verdict}"`);
  if (modifiedEntry?.verdict !== 'UNTRUSTED') {
    console.error('[FAIL] Local block verdict was not degraded to UNTRUSTED.');
    process.exit(1);
  }
  console.log('  - ✅ PASS: Ledger block successfully quarantined to UNTRUSTED status.');

  console.log("\n=========================================================================");
  console.log("✅ ZTAN Byzantine Drift & Parity Validation PASSED.");
  console.log("=========================================================================");
  process.exit(0);
}

runByzantineDriftValidation().catch((err) => {
  console.error('[FAIL] Critical failure in Byzantine drift validation:', err);
  process.exit(1);
});
