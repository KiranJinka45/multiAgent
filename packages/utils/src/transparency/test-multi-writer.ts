import { GovernanceLedger } from '../governance-ledger.js';
import { db } from '@packages/db';
import { fork } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMultiWriterContentionValidation() {
  console.log("=========================================================================");
  console.log("  ZTAN v1.5.0 Cross-Process Multi-Writer Lock Contention Hardening Suite ");
  console.log("=========================================================================");

  // 1. Pristine environment reset
  console.log('[RESET] Setting up pristine database and filesystem environment...');
  await db.$executeRawUnsafe(`TRUNCATE TABLE "ZtanLedgerBlock" RESTART IDENTITY CASCADE;`);
  await db.$executeRawUnsafe(`TRUNCATE TABLE "ZtanActiveLease" RESTART IDENTITY CASCADE;`);
  
  const ledgerDir = path.join(process.cwd(), '.ztan-transparency');
  if (fs.existsSync(ledgerDir)) {
    fs.rmSync(ledgerDir, { recursive: true, force: true });
  }

  // 2. Initialize
  console.log('[TEST] Initializing Governance Ledger Genesis (acquires startup lock)...');
  GovernanceLedger.init();

  const LOCK_FILE = GovernanceLedger.getLockFile(0);

  // Wait robustly for any background initialization/sync (e.g. initDbSync, processOutbox) to fully complete
  console.log('[TEST] Waiting for background sync and lock release to complete...');
  let syncSettled = false;
  for (let i = 0; i < 150; i++) {
    const lockExists = fs.existsSync(LOCK_FILE);
    const outboxStatus = GovernanceLedger.getOutboxStatus();
    if (!lockExists && outboxStatus.synchronized) {
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

  const initialLedger = GovernanceLedger.loadLedger();
  console.log(`  - Genesis initialized. Initial local size: ${initialLedger.length} block.`);

  // 3. Spawn child process to write concurrently
  console.log('\n[TEST] Spawning concurrent child process for cross-process contention...');
  const childScript = path.join(__dirname, 'multi-writer-child.ts');
  
  // Use tsx to execute TS file directly in child process
  const child = fork(childScript, [], {
    execArgv: ['--import', 'tsx']
  });

  // 4. Append blocks from parent process in parallel with child process
  console.log('[PARENT] Starting parent appends in parallel with child process...');
  for (let idx = 0; idx < 10; idx++) {
    // Introduce micro jitter to maximize lock collision probabilities
    await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
    try {
      const payload = `ZTAN-CONCURRENT-PARENT-${idx + 1}: Parent operator lock write`;
      const entry = await GovernanceLedger.appendEntry('POLICY', payload, 'PARENT-OPERATOR', 'VERIFIED', '105');
      console.log(`[PARENT] ✅ Appended block ${entry.sequenceId} successfully.`);
    } catch (err: any) {
      console.error(`[PARENT] ❌ Append failed: ${err.message || err}`);
      throw err;
    }
  }
  
  await new Promise<void>((resolve, reject) => {
    child.on('exit', (code) => {
      if (code === 0) {
        console.log('[PARENT] Child process finished successfully.');
        resolve();
      } else {
        reject(new Error(`Child process failed with exit code ${code}`));
      }
    });
  });

  console.log('\n[TEST] Waiting for replication sync and settling to database...');
  let settled = false;
  // Total expected size: 1 (Genesis) + 10 (Parent) + 10 (Child) = 21 blocks
  const EXPECTED_COUNT = 21;

  for (let i = 0; i < 50; i++) {
    // Check outbox reconciliation
    await GovernanceLedger.processOutbox().catch(() => {});
    const dbCount = await db.ztanLedgerBlock.count();
    const localCount = GovernanceLedger.loadLedger().length;
    
    console.log(`  - Checking parity: Local size = ${localCount}, PostgreSQL size = ${dbCount} (Expected: ${EXPECTED_COUNT})`);
    
    if (dbCount === EXPECTED_COUNT && localCount === EXPECTED_COUNT) {
      settled = true;
      console.log('  - ✅ PASS: Monotonic parity achieved between local ledger and PostgreSQL!');
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  if (!settled) {
    const dbCount = await db.ztanLedgerBlock.count();
    const localCount = GovernanceLedger.loadLedger().length;
    console.error(`[FAIL] Verification timeout: Parity drift detected. Local = ${localCount}, PG = ${dbCount}, expected = ${EXPECTED_COUNT}`);
    process.exit(1);
  }

  // 5. Verify local ledger integrity
  console.log('\n[TEST] Verifying local ledger chain continuity and cryptographic integrity...');
  const localAudit = GovernanceLedger.verifyLedger();
  console.log(`  - Local ledger validation outcome: ${localAudit.valid ? '✅ VALID' : '❌ INVALID'}`);
  if (!localAudit.valid) {
    console.error(`[FAIL] Cryptographic integrity verification failed on local ledger: ${localAudit.error}`);
    process.exit(1);
  }
  console.log('  - ✅ PASS: Local ledger is cryptographically unbroken and free from concurrency-induced hash fractures.');

  // 6. Verify PostgreSQL consensus storage integrity
  console.log('\n[TEST] Verifying PostgreSQL consensus storage continuity and trigger immutability...');
  const dbAudit = await GovernanceLedger.verifyDbLedger();
  console.log(`  - PostgreSQL database validation outcome: ${dbAudit.valid ? '✅ VALID' : '❌ INVALID'}`);
  if (!dbAudit.valid) {
    console.error(`[FAIL] Cryptographic validation failed on PostgreSQL database: ${dbAudit.error}`);
    process.exit(1);
  }
  console.log('  - ✅ PASS: Replicated consensus storage matches local authoritative records with perfect chain-hashes!');

  // 7. Verify perfectly continuous sequence IDs (No duplicates, no missing links)
  console.log('\n[TEST] Verifying sequence continuity constraints...');
  const finalLedger = GovernanceLedger.loadLedger();
  
  // Sort ledger by sequenceId to verify monotonic increments
  finalLedger.sort((a, b) => a.sequenceId - b.sequenceId);
  for (let i = 0; i < finalLedger.length; i++) {
    const expectedSeq = 1000 + i;
    if (finalLedger[i].sequenceId !== expectedSeq) {
      console.error(`[FAIL] Sequence breach: expected sequence ${expectedSeq} but found ${finalLedger[i].sequenceId}`);
      process.exit(1);
    }
  }
  console.log('  - ✅ PASS: Ledger sequence numbers are perfectly continuous and monotonically strictly incrementing!');

  console.log("\n=========================================================================");
  console.log("✅ ZTAN Multi-Writer Contention & File Locking Hardening PASSED.");
  console.log("=========================================================================");
  process.exit(0);
}

runMultiWriterContentionValidation().catch((err) => {
  console.error('[FAIL] Critical failure in multi-writer contention validation:', err);
  process.exit(1);
});
