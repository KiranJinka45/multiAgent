import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';

const envConfig = dotenv.config();
dotenvExpand.expand(envConfig);

if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(/^"(.*)"$/, '$1');
}

import { GovernanceLedger } from '../governance-ledger.js';
import { db } from '@packages/db';
import { fork } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function resetEnvironment() {
  console.log('[RESET] Setting up pristine database and filesystem environment...');
  await db.$executeRawUnsafe(`TRUNCATE TABLE "ZtanLedgerBlock", "ZtanWalLog", "ZtanSnapshot", "ZtanActiveLease", "ZtanPayloadAttestation", "ZtanQuarantineBlob", "IdempotencyRecord", "AuditLog" RESTART IDENTITY CASCADE;`);
  await db.$executeRawUnsafe(`TRUNCATE TABLE "ZtanActiveLease" RESTART IDENTITY CASCADE;`);
  await db.$executeRawUnsafe(`TRUNCATE TABLE "ZtanWalLog" RESTART IDENTITY CASCADE;`);
  
  const ledgerDir = path.join(process.cwd(), '.ztan-transparency');
  if (fs.existsSync(ledgerDir)) {
    fs.rmSync(ledgerDir, { recursive: true, force: true });
  }
}

async function waitAndProcessOutbox() {
  // Gracefully process any background outbox replication
  await new Promise(resolve => setTimeout(resolve, 500));
  await GovernanceLedger.processOutbox().catch(() => {});
}

async function getPartition0DbCount(): Promise<number> {
  const dbBlocks = await db.ztanLedgerBlock.findMany();
  return dbBlocks.filter((b: any) => parseInt(b.blockId, 10) < 1000000).length;
}

async function runKillPointTest(killPoint: string, expectedExitCode: number) {
  console.log(`\n=========================================================================`);
  console.log(` [TEST CASE] Executing Crash Injection Drill for Kill Point: ${killPoint}`);
  console.log(`=========================================================================`);
  
  await resetEnvironment();

  // Initialize Genesis block
  console.log('[PARENT] Initializing genesis ledger (acquires startup lock)...');
  GovernanceLedger.init();
  await waitAndProcessOutbox();
  GovernanceLedger.stopBackgroundTasks();

  const genesisLocal = GovernanceLedger.loadLedger(0);
  const genesisDbCount = await getPartition0DbCount();
  console.log(`[PARENT] Genesis complete. Local: ${genesisLocal.length} block, DB: ${genesisDbCount} block.`);

  // Fork child to perform append and trigger kill point
  const childScript = path.join(__dirname, 'crash-child.ts');
  console.log(`[PARENT] Spawning child process with ZTAN_KILL_POINT=${killPoint}...`);
  
  const child = fork(childScript, [], {
    execArgv: ['--import', 'tsx'],
    env: {
      ...process.env,
      ZTAN_KILL_POINT: killPoint,
      ZTAN_PARTITIONS: '1'
    }
  });

  const exitCode = await new Promise<number | null>((resolve) => {
    child.on('exit', (code) => {
      resolve(code);
    });
  });

  console.log(`[PARENT] Child process exited with code: ${exitCode} (Expected: ${expectedExitCode})`);
  if (exitCode !== expectedExitCode) {
    throw new Error(`[FAIL] Child process exited with ${exitCode} instead of expected ${expectedExitCode}`);
  }

  // Pre-recovery state check
  const preLocalCount = GovernanceLedger.loadLedger(0).length;
  const preDbCount = await getPartition0DbCount();
  console.log(`[PRE-RECOVERY] Local block count: ${preLocalCount}, DB block count: ${preDbCount}`);

  // Pre-clear lease table to enable instantaneous parent recovery takeover
  console.log('[PARENT] Pre-clearing active leases to accelerate mastership takeover...');
  await db.$executeRawUnsafe(`TRUNCATE TABLE "ZtanActiveLease" RESTART IDENTITY CASCADE;`);

  // Run SRE Recovery Ceremony!
  console.log('[PARENT] Initiating SRE Self-Healing Recovery Ceremony...');
  GovernanceLedger.init();
  
  // Wait robustly for the partition state to settle out of REBUILDING
  let syncSettled = false;
  for (let i = 0; i < 150; i++) {
    const state = GovernanceLedger.getState(0);
    if (state === 'ACTIVE' || state === 'DEGRADED') {
      syncSettled = true;
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  if (!syncSettled) {
    console.warn(`[PARENT] Partition 0 state did not settle in time. Current state: ${GovernanceLedger.getState(0)}`);
  }
  
  GovernanceLedger.stopBackgroundTasks();

  // Post-recovery state checks and assertions
  const postLocal = GovernanceLedger.loadLedger(0);
  const postDbCount = await getPartition0DbCount();
  console.log(`[POST-RECOVERY] Local block count: ${postLocal.length}, DB block count: ${postDbCount}`);

  if (killPoint === 'BEFORE_DB_COMMIT') {
    // DB transaction aborted, local never written
    if (postLocal.length !== 1 || postDbCount !== 1) {
      throw new Error(`[FAIL] BEFORE_DB_COMMIT: Expected exactly 1 block (genesis), got Local: ${postLocal.length}, DB: ${postDbCount}`);
    }
    console.log('[SUCCESS] BEFORE_DB_COMMIT: Perfect recovery parity. Ledger remains clean.');
  }

  else if (killPoint === 'BEFORE_LOCAL_FSYNC' || killPoint === 'AFTER_DB_COMMIT') {
    // DB committed, local missing. Reconstructed from DB to Local!
    if (postLocal.length !== 2 || postDbCount !== 2) {
      throw new Error(`[FAIL] ${killPoint}: Expected exactly 2 blocks (genesis + restored), got Local: ${postLocal.length}, DB: ${postDbCount}`);
    }
    const restoredBlock = postLocal[1];
    if (!restoredBlock.payload.includes('ZTAN-CRASH-TEST-PAYLOAD')) {
      throw new Error(`[FAIL] ${killPoint}: Restored block payload mismatch: ${restoredBlock.payload}`);
    }
    console.log(`[SUCCESS] ${killPoint}: Bidirectional recovery complete! Restored missing local block from DB.`);
  }

  else if (killPoint === 'AFTER_LOCAL_FSYNC' || killPoint === 'BEFORE_ACK') {
    // Both committed and written.
    if (postLocal.length !== 2 || postDbCount !== 2) {
      throw new Error(`[FAIL] ${killPoint}: Expected exactly 2 blocks, got Local: ${postLocal.length}, DB: ${postDbCount}`);
    }
    console.log(`[SUCCESS] ${killPoint}: Both nodes saved block. Normal operational recovery.`);
  }
}

async function main() {
  try {
    console.log("=========================================================================");
    console.log("  ZTAN Distributed Ledger Crash Injection and Recovery Validation Suite   ");
    console.log("=========================================================================");

    await runKillPointTest('BEFORE_DB_COMMIT', 138);
    await runKillPointTest('AFTER_DB_COMMIT', 139);
    await runKillPointTest('BEFORE_LOCAL_FSYNC', 137);
    await runKillPointTest('AFTER_LOCAL_FSYNC', 140);
    await runKillPointTest('BEFORE_ACK', 141);

    console.log("\n=========================================================================");
    console.log("  ✅ ALL CRASH INJECTION DRILLS PASSED SUCCESSFULLY WITH PERFECT PARITY!");
    console.log("=========================================================================");
    process.exit(0);
  } catch (err: any) {
    console.error(`\n❌ DRILL HARNESS FAILED: ${err.message || err}`);
    process.exit(1);
  }
}

main();
