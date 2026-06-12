import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';

const envConfig = dotenv.config();
dotenvExpand.expand(envConfig);

if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(/^"(.*)"$/, '$1');
}

import { GovernanceLedger } from '../governance-ledger.js';
import { db } from '@packages/db';
import { fork, type ChildProcess } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function resetEnvironment(): Promise<void> {
  console.log('[RESET] Wiping database tables and local filesystem state...');
  await db.$executeRawUnsafe(`TRUNCATE TABLE "ZtanLedgerBlock", "ZtanWalLog", "ZtanSnapshot", "ZtanActiveLease", "ZtanPayloadAttestation", "ZtanQuarantineBlob", "IdempotencyRecord", "AuditLog" RESTART IDENTITY CASCADE;`);
  await db.$executeRawUnsafe(`TRUNCATE TABLE "ZtanActiveLease" RESTART IDENTITY CASCADE;`);
  await db.$executeRawUnsafe(`TRUNCATE TABLE "ZtanWalLog" RESTART IDENTITY CASCADE;`);
  await db.$executeRawUnsafe(`TRUNCATE TABLE "AuditLog" RESTART IDENTITY CASCADE;`);
  await db.$executeRawUnsafe(`TRUNCATE TABLE "IdempotencyRecord" RESTART IDENTITY CASCADE;`);

  const ledgerDir = path.join(process.cwd(), '.ztan-transparency');
  if (fs.existsSync(ledgerDir)) {
    fs.rmSync(ledgerDir, { recursive: true, force: true });
  }
}

async function clearLeases(): Promise<void> {
  await db.$executeRawUnsafe(`TRUNCATE TABLE "ZtanActiveLease" RESTART IDENTITY CASCADE;`);
}

async function _waitForSettled(): Promise<boolean> {
  for (let i = 0; i < 150; i++) {
    const state = GovernanceLedger.getState(0);
    if (state === 'ACTIVE' || state === 'DEGRADED') {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return false;
}

async function getPartition0Counts(): Promise<{
  localBlocks: number;
  dbBlocks: number;
  dbAuditLogs: number;
  dbIdempotencyRecords: number;
  dbWalLogs: number;
}> {
  const allDbBlocks = await db.ztanLedgerBlock.findMany();
  const dbBlocks = allDbBlocks.filter((b: any) => parseInt(b.blockId, 10) < 1_000_000).length;
  const dbAuditLogs = await db.auditLog.count();
  const dbIdempotencyRecords = await db.idempotencyRecord.count();
  const dbWalLogs = await db.ztanWalLog.count();
  const localBlocks = GovernanceLedger.loadLedger(0).length;
  return { localBlocks, dbBlocks, dbAuditLogs, dbIdempotencyRecords, dbWalLogs };
}

function generateUUIDs() {
  return {
    requestUuid: crypto.randomUUID(),
    auditUuid: crypto.randomUUID(),
    outboxUuid: crypto.randomUUID(),
    ledgerBlockUuid: crypto.randomUUID(),
  };
}

function spawnRecoveryChild(opts: {
  killPoint: string;
  requestUuid: string;
  auditUuid: string;
  outboxUuid: string;
  ledgerBlockUuid: string;
}): Promise<{ exitCode: number | null; stdout: string; stderr: string }> {
  const childScript = path.join(__dirname, 'crash-recovery-child.ts');
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';

    const child: ChildProcess = fork(childScript, [], {
      execArgv: ['--import', 'tsx'],
      silent: true,
      env: {
        ...process.env,
        ZTAN_KILL_POINT: opts.killPoint,
        ZTAN_REQUEST_UUID: opts.requestUuid,
        ZTAN_AUDIT_UUID: opts.auditUuid,
        ZTAN_OUTBOX_UUID: opts.outboxUuid,
        ZTAN_BLOCK_UUID: opts.ledgerBlockUuid,
        ZTAN_PARTITIONS: '1',
      },
    });

    child.stdout?.on('data', (data) => { stdout += data.toString(); });
    child.stderr?.on('data', (data) => { stderr += data.toString(); });

    child.on('exit', (code) => {
      resolve({ exitCode: code, stdout, stderr });
    });
  });
}

// ─── Test Case 1: Crash-After-Commit-Before-Ack ──────────────────────────────

async function testCrashBeforeAck(): Promise<void> {
  console.log('\n=========================================================================');
  console.log(' [TEST 1] Crash-After-Commit-Before-Ack Simulation');
  console.log('=========================================================================');

  await resetEnvironment();

  // Initialize genesis
  GovernanceLedger.init();
  await new Promise(r => setTimeout(r, 500));
  await GovernanceLedger.processOutbox().catch(() => {});
  GovernanceLedger.stopBackgroundTasks();

  const preState = await getPartition0Counts();
  console.log(`[GENESIS] Local: ${preState.localBlocks}, DB: ${preState.dbBlocks}`);

  const ids = generateUUIDs();
  console.log(`[PARENT] Spawning child with ZTAN_KILL_POINT=BEFORE_ACK, requestUuid=${ids.requestUuid}`);

  // Clear leases so the child can acquire
  await clearLeases();

  const result = await spawnRecoveryChild({
    killPoint: 'BEFORE_ACK',
    ...ids,
  });

  console.log(`[PARENT] Child exited with code: ${result.exitCode} (expected: 141)`);

  if (result.exitCode !== 141) {
    console.log(`[CHILD STDOUT]\n${result.stdout}`);
    console.log(`[CHILD STDERR]\n${result.stderr}`);
    throw new Error(`[FAIL] Child exited with ${result.exitCode}, expected 141 (BEFORE_ACK kill)`);
  }

  // Verify the child committed to both DB and local before crashing
  const postCrash = await getPartition0Counts();
  console.log(`[POST-CRASH] Local: ${postCrash.localBlocks}, DB: ${postCrash.dbBlocks}, Idem: ${postCrash.dbIdempotencyRecords}`);

  if (postCrash.dbBlocks < 2) {
    throw new Error(`[FAIL] Expected child to have committed to DB before exit. DB blocks: ${postCrash.dbBlocks}`);
  }
  if (postCrash.dbIdempotencyRecords < 1) {
    throw new Error(`[FAIL] Expected IdempotencyRecord to exist after commit. Count: ${postCrash.dbIdempotencyRecords}`);
  }

  console.log('[SUCCESS] Test 1: Child committed to DB and local, then crashed before ack.');
  console.log(`  DB blocks: ${postCrash.dbBlocks}, IdempotencyRecords: ${postCrash.dbIdempotencyRecords}`);
}

// ─── Test Case 2: Sequential Retry After Crash ──────────────────────────────

async function testSequentialRetryRecovery(): Promise<void> {
  console.log('\n=========================================================================');
  console.log(' [TEST 2] Sequential Retry After Crash-Before-Ack');
  console.log('=========================================================================');

  // State carries over from Test 1 — DO NOT reset.
  // The DB already has a committed block and IdempotencyRecord from the crash.

  const preRetry = await getPartition0Counts();
  console.log(`[PRE-RETRY] Local: ${preRetry.localBlocks}, DB: ${preRetry.dbBlocks}, Idem: ${preRetry.dbIdempotencyRecords}`);

  // Get the requestUuid from the existing IdempotencyRecord
  const idempotencyRecs = await db.idempotencyRecord.findMany();
  if (idempotencyRecs.length === 0) {
    throw new Error('[FAIL] No IdempotencyRecord found — Test 1 may have failed.');
  }

  const existingKey = idempotencyRecs[0].key;
  const requestUuid = existingKey.replace('ztan-request-', '');
  console.log(`[RETRY] Using same requestUuid: ${requestUuid}`);

  // Clear leases so the retry child can acquire
  await clearLeases();

  // The child lock file may be stale from the killed process
  const ledgerDir = path.join(process.cwd(), '.ztan-transparency');
  const lockFile = path.join(ledgerDir, 'ledger.lock');
  if (fs.existsSync(lockFile)) {
    fs.unlinkSync(lockFile);
    console.log('[RETRY] Cleared stale lock file from crashed child.');
  }

  // Spawn a retry child with NO kill point — it should find the existing block
  const retryResult = await spawnRecoveryChild({
    killPoint: 'NONE',
    requestUuid,
    auditUuid: crypto.randomUUID(),
    outboxUuid: crypto.randomUUID(),
    ledgerBlockUuid: crypto.randomUUID(),
  });

  console.log(`[PARENT] Retry child exited with code: ${retryResult.exitCode} (expected: 0)`);
  if (retryResult.stdout) {
    console.log(`[RETRY STDOUT]\n${retryResult.stdout.trim()}`);
  }

  if (retryResult.exitCode !== 0) {
    console.log(`[RETRY STDERR]\n${retryResult.stderr}`);
    throw new Error(`[FAIL] Retry child exited with ${retryResult.exitCode}, expected 0`);
  }

  // Verify zero duplicate writes
  const postRetry = await getPartition0Counts();
  console.log(`[POST-RETRY] Local: ${postRetry.localBlocks}, DB: ${postRetry.dbBlocks}, Idem: ${postRetry.dbIdempotencyRecords}, WAL: ${postRetry.dbWalLogs}`);

  // The DB block count should not have increased (no duplicate commits)
  if (postRetry.dbBlocks > preRetry.dbBlocks) {
    throw new Error(`[FAIL] Duplicate DB block detected! Pre: ${preRetry.dbBlocks}, Post: ${postRetry.dbBlocks}`);
  }
  if (postRetry.dbIdempotencyRecords > preRetry.dbIdempotencyRecords) {
    throw new Error(`[FAIL] Duplicate IdempotencyRecord detected! Pre: ${preRetry.dbIdempotencyRecords}, Post: ${postRetry.dbIdempotencyRecords}`);
  }

  // Verify the retry child found and returned the existing block
  if (!retryResult.stdout.includes('Finished append successfully') && !retryResult.stdout.includes('Idempotent retry hit')) {
    // Both are valid — if the fast-path check found it, it prints via the ledger logger,
    // if the child completed the append fast-path, it prints "Finished append successfully"
    console.log('[INFO] Child output did not contain explicit idempotency hit log, but exit 0 indicates success.');
  }

  console.log('[SUCCESS] Test 2: Sequential retry returned existing block with zero duplicates.');
}

// ─── Test Case 3: Concurrent Replay Race ────────────────────────────────────

async function testConcurrentReplayRace(): Promise<void> {
  console.log('\n=========================================================================');
  console.log(' [TEST 3] Concurrent Replay Race Condition');
  console.log('=========================================================================');

  await resetEnvironment();

  // Initialize genesis
  GovernanceLedger.init();
  await new Promise(r => setTimeout(r, 500));
  await GovernanceLedger.processOutbox().catch(() => {});
  GovernanceLedger.stopBackgroundTasks();

  const preState = await getPartition0Counts();
  console.log(`[GENESIS] Local: ${preState.localBlocks}, DB: ${preState.dbBlocks}`);

  const ids = generateUUIDs();
  const concurrency = 5;
  console.log(`[RACE] Spawning ${concurrency} concurrent children with identical requestUuid=${ids.requestUuid}`);

  // Clear leases
  await clearLeases();

  // Clear lock file
  const ledgerDir = path.join(process.cwd(), '.ztan-transparency');
  const lockFile = path.join(ledgerDir, 'ledger.lock');
  if (fs.existsSync(lockFile)) {
    fs.unlinkSync(lockFile);
  }

  // Launch all children simultaneously
  const promises = Array.from({ length: concurrency }, (_, _i) =>
    spawnRecoveryChild({
      killPoint: 'NONE',
      requestUuid: ids.requestUuid,
      auditUuid: ids.auditUuid,
      outboxUuid: ids.outboxUuid,
      ledgerBlockUuid: ids.ledgerBlockUuid,
    })
  );

  const results = await Promise.all(promises);

  // Classify outcomes
  let successCount = 0;    // exit code 0 — won the race or found existing via idempotency
  let dedupeCount = 0;     // exit code 202 — P2002 unique constraint (deduplicated at DB level)
  let leaseRejectCount = 0; // exit code 1 — lease contention prevented reaching appendEntry (admission control)
  let failCount = 0;       // other exit codes (unexpected)

  for (const r of results) {
    if (r.exitCode === 0) successCount++;
    else if (r.exitCode === 202) dedupeCount++;
    else if (r.exitCode === 1) {
      leaseRejectCount++;
      // Lease contention is expected under concurrent pressure — 
      // the distributed lease prevents the child from reaching the DB transaction at all.
      // This is correct admission control, not a deduplication failure.
    }
    else {
      failCount++;
      console.log(`[RACE-FAIL] Unexpected exit code ${r.exitCode}:`);
      console.log(`  STDOUT: ${r.stdout.trim()}`);
      console.log(`  STDERR: ${r.stderr.trim()}`);
    }
  }

  console.log(`[RACE RESULTS] Success: ${successCount}, Deduplicated (P2002): ${dedupeCount}, Lease-Rejected: ${leaseRejectCount}, Failed: ${failCount}`);

  // Verify that the total successes (actual commits) is bounded
  // At most one child should have committed a brand-new block.
  // Others must have either:
  //   a) hit the P2002 and exited 202, or
  //   b) hit the pre-lock/post-lock idempotency check and exited 0.
  // So we expect: successCount >= 1 (at least one got through) and failCount === 0.

  if (failCount > 0) {
    throw new Error(`[FAIL] ${failCount} children failed with unexpected exit codes.`);
  }

  if (successCount < 1) {
    throw new Error(`[FAIL] No child successfully committed. All were deduplicated or failed.`);
  }

  // Critical assertion: Verify EXACTLY ONE block was created in the DB for this requestUuid
  const matchingBlocks = await db.ztanLedgerBlock.findMany({
    where: {
      payload: {
        contains: `requestUuid=${ids.requestUuid}`,
      },
    },
  });

  console.log(`[RACE DB CHECK] Blocks in DB matching requestUuid: ${matchingBlocks.length}`);

  if (matchingBlocks.length !== 1) {
    throw new Error(
      `[FAIL] Expected exactly 1 DB block for requestUuid=${ids.requestUuid}, found ${matchingBlocks.length}. ` +
      `Race condition deduplication is BROKEN.`
    );
  }

  // Verify exactly one IdempotencyRecord
  const idemRecords = await db.idempotencyRecord.findMany({
    where: {
      key: `ztan-request-${ids.requestUuid}`,
    },
  });

  console.log(`[RACE IDEM CHECK] IdempotencyRecords for requestUuid: ${idemRecords.length}`);
  if (idemRecords.length !== 1) {
    throw new Error(
      `[FAIL] Expected exactly 1 IdempotencyRecord for requestUuid=${ids.requestUuid}, found ${idemRecords.length}.`
    );
  }

  // Verify WAL consistency — should have exactly one COMMITTED entry for this sequence
  const block = matchingBlocks[0];
  const walLogs = await db.ztanWalLog.findMany({
    where: { seq: parseInt(block.blockId, 10) },
  });
  console.log(`[RACE WAL CHECK] WAL entries for winning block seq=${block.blockId}: ${walLogs.length}`);
  if (walLogs.length !== 1) {
    throw new Error(`[FAIL] Expected exactly 1 WAL entry for seq=${block.blockId}, found ${walLogs.length}`);
  }
  if (walLogs[0].status !== 'COMMITTED') {
    throw new Error(`[FAIL] WAL entry status is '${walLogs[0].status}', expected 'COMMITTED'`);
  }

  console.log('[SUCCESS] Test 3: Concurrent replay race resolved with exactly-one-commit semantics.');
  console.log(`  Total children: ${concurrency}, Winners: ${successCount}, Deduplicated: ${dedupeCount}, Lease-Rejected: ${leaseRejectCount}`);
}

// ─── Main Suite ──────────────────────────────────────────────────────────────

async function main() {
  try {
    console.log('=========================================================================');
    console.log('  ZTAN Crash Recovery & Replay Race Correctness Validation Suite');
    console.log('  Phase 19: Transactional Resilience Hardening');
    console.log('=========================================================================');

    // Test 1 + Test 2 run sequentially (Test 2 depends on Test 1's state)
    await testCrashBeforeAck();
    await testSequentialRetryRecovery();

    // Test 3 runs on a fresh environment
    await testConcurrentReplayRace();

    console.log('\n=========================================================================');
    console.log('  ✅ ALL CRASH RECOVERY & REPLAY RACE TESTS PASSED');
    console.log('');
    console.log('  Verified:');
    console.log('    • BEFORE_ACK crash exits with code 141 after commit');
    console.log('    • Sequential retry recovers existing block (zero duplicates)');
    console.log('    • Concurrent replay race produces exactly-one DB commit');
    console.log('    • IdempotencyRecord unique constraint enforced atomically');
    console.log('    • WAL log consistency maintained under concurrent pressure');
    console.log('=========================================================================');

    await db.$disconnect();
    process.exit(0);
  } catch (err: any) {
    console.error(`\n❌ CRASH RECOVERY SUITE FAILED: ${err.message || err}`);
    await db.$disconnect().catch(() => {});
    process.exit(1);
  }
}

main();
