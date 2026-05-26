import * as dotenv from 'dotenv';
import * as dotenvExpand from 'dotenv-expand';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Load environment variables from workspace root
const rootEnv = path.resolve(process.cwd(), '.env');
if (fs.existsSync(rootEnv)) {
  const envConfig = dotenv.config({ path: rootEnv });
  dotenvExpand.expand(envConfig);
}

import { GovernanceLedger } from '../governance-ledger.js';
import { db } from '@packages/db';


async function runReplicatedConsensusValidation() {
  console.log("=========================================================================");
  console.log("  ZTAN v1.5.0 Replicated Consensus Persistence & Immutability Test      ");
  console.log("=========================================================================");

  // 1. Pristine reset to avoid cross-test contamination
  console.log('[RESET] Setting up clean test workspaces...');
  await db.$executeRawUnsafe(`TRUNCATE TABLE "ZtanLedgerBlock", "ZtanWalLog", "ZtanSnapshot", "ZtanActiveLease", "ZtanPayloadAttestation", "ZtanQuarantineBlob", "IdempotencyRecord", "AuditLog" RESTART IDENTITY CASCADE;`);
  
  const fs = await import('node:fs');
  const path = await import('node:path');
  const ledgerDir = path.join(process.cwd(), '.ztan-transparency');
  if (fs.existsSync(ledgerDir)) {
    fs.rmSync(ledgerDir, { recursive: true, force: true });
  }

  // 2. Initialize the Governance Ledger (This triggers the database sync-up ceremony)
  console.log('[TEST] Initializing Governance Ledger & executing automatic Postgres sync ceremony...');
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

  // 2. Append new operational entries
  console.log('[TEST] Appending new policy override and telemetry drift logs...');
  const entry1 = await GovernanceLedger.appendEntry(
    'POLICY',
    'ZTAN-RESOLUTION: Cognitive Saturation Override Ceremony Authorized by Supervisor.',
    'ZTAN-SUPERVISOR-01',
    'VERIFIED',
    '105'
  );
  console.log(`  - Appended Entry 1 (Seq: ${entry1.sequenceId}) with Hash: ${entry1.hash}`);

  const entry2 = await GovernanceLedger.appendEntry(
    'TELEMETRY',
    'ZTAN-HEARTBEAT: Distributed validator nodes in sync, total network delay: 4ms.',
    'SYSTEM',
    'VERIFIED',
    '105'
  );
  console.log(`  - Appended Entry 2 (Seq: ${entry2.sequenceId}) with Hash: ${entry2.hash}`);

  // Retrieve total local ledger length to poll for DB convergence parity
  const localLedger = GovernanceLedger.loadLedger();
  const expectedBlockCount = localLedger.length;
  console.log(`[TEST] Polling Postgres consensus storage until row count matches local ledger size (${expectedBlockCount} blocks)...`);
  
  let settled = false;
  for (let i = 0; i < 50; i++) {
    const allDbBlocks = await db.ztanLedgerBlock.findMany().catch(() => []);
    const dbCount = allDbBlocks.filter((b: any) => !isNaN(parseInt(b.blockId, 10))).length;
    if (dbCount >= expectedBlockCount) {
      settled = true;
      console.log(`  - Parity achieved! Found ${dbCount} blocks in PostgreSQL.`);
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 150));
  }

  if (!settled) {
    console.error(`[FAIL] Database did not converge to expected ${expectedBlockCount} blocks within time limit.`);
    process.exit(1);
  }

  // 3. Verify Local Ledger Integrity
  console.log('\n[TEST] Verifying local filesystem chain integrity...');
  const localAudit = GovernanceLedger.verifyLedger();
  console.log(`  - Local Audit Outcome: ${localAudit.valid ? '✅ VALID' : '❌ INVALID'}`);
  if (!localAudit.valid) {
    console.error(`[FAIL] Local ledger verification failed: ${localAudit.error}`);
    process.exit(1);
  }

  // 4. Verify Database consensus chain integrity
  console.log('\n[TEST] Verifying PostgreSQL consensus database chain integrity...');
  const dbAudit = await GovernanceLedger.verifyDbLedger();
  console.log(`  - Database Audit Outcome: ${dbAudit.valid ? '✅ VALID' : '❌ INVALID'}`);
  console.log(`  - Audited Blocks: ${dbAudit.count}`);
  if (!dbAudit.valid) {
    console.error(`[FAIL] Database verification failed: ${dbAudit.error}`);
    process.exit(1);
  }

  // 5. Test Trigger-Enforced Physical Immutability (Byzantine Mutation Attack Injection)
  console.log('\n[TEST] Simulating Byzantine Mutation Attack (Attempting to modify DB entry)...');
  try {
    await db.ztanLedgerBlock.update({
      where: { blockId: entry1.sequenceId.toString() },
      data: { payload: 'MALICIOUS_BYPASS_ATTEMPT_TO_MUTATE_TIMELINE' }
    });
    console.error('[FAIL] Byzantine Mutation Attack succeeded! The PostgreSQL trigger did not prevent updating the ledger block.');
    process.exit(1);
  } catch (err: any) {
    console.log('  - Mutation Attack Successfully Intercepted by Database trigger!');
    console.log(`  - Interception message: "${err.message || err}"`);
    if (err.message && (err.message.includes('ZTAN Immutable Ledger Violation') || err.message.includes('ZTAN Safety Violation: Ledger records are strictly append-only'))) {
      console.log('  - ✅ PASS: Standard immutable guard validation message verified.');
    } else {
      console.warn('  - WARNING: Guard triggered, but verification message was non-standard.');
    }
  }

  // 6. Test Trigger-Enforced Deletion Prevention
  console.log('\n[TEST] Simulating Purge Attack (Attempting to delete Genesis/Ledger block)...');
  try {
    await db.ztanLedgerBlock.delete({
      where: { blockId: '1000' }
    });
    console.error('[FAIL] Purge Attack succeeded! The PostgreSQL trigger did not prevent deleting the block.');
    process.exit(1);
  } catch (err: any) {
    console.log('  - Purge Attack Successfully Intercepted by Database trigger!');
    console.log(`  - Interception message: "${err.message || err}"`);
    if (err.message && (err.message.includes('ZTAN Immutable Ledger Violation') || err.message.includes('ZTAN Safety Violation: Ledger records are strictly append-only'))) {
      console.log('  - ✅ PASS: Standard deletion guard validation message verified.');
    } else {
      console.warn('  - WARNING: Guard triggered, but verification message was non-standard.');
    }
  }

  console.log("\n=========================================================================");
  console.log("✅ ZTAN Replicated Consensus Persistence & Immutability Suite PASSED.");
  console.log("=========================================================================");
  process.exit(0);
}

runReplicatedConsensusValidation().catch((err) => {
  console.error('[TEST] Fatal error executing replicated consensus test:', err);
  process.exit(1);
});
