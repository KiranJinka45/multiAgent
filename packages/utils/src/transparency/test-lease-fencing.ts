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

const LEDGER_DIR = path.join(process.cwd(), '.ztan-transparency');
const LOCK_FILE = GovernanceLedger.getLockFile(0);

async function runLeaseFencingValidation() {
  console.log("=========================================================================");
  console.log("    ZTAN v1.5.0 Monotonic Lease Fencing & Zombie Writer Verification     ");
  console.log("=========================================================================");

  // 1. Pristine environment reset
  console.log('[RESET] Setting up pristine database and filesystem environment...');
  await db.$executeRawUnsafe(`TRUNCATE TABLE "ZtanLedgerBlock", "ZtanWalLog", "ZtanSnapshot", "ZtanActiveLease", "ZtanPayloadAttestation", "ZtanQuarantineBlob", "IdempotencyRecord", "AuditLog" RESTART IDENTITY CASCADE;`);
  
  if (fs.existsSync(LEDGER_DIR)) {
    try {
      fs.rmSync(LEDGER_DIR, { recursive: true, force: true });
    } catch (e) {
      const cleanDir = (p: string) => {
        if (fs.existsSync(p)) {
          fs.readdirSync(p).forEach(file => {
            const curPath = path.join(p, file);
            if (fs.lstatSync(curPath).isDirectory()) {
              cleanDir(curPath);
              try { fs.rmdirSync(curPath); } catch (_) {}
            } else {
              try { fs.unlinkSync(curPath); } catch (_) {}
            }
          });
        }
      };
      cleanDir(LEDGER_DIR);
    }
  }

  // 2. Initialize
  console.log('[TEST] Initializing Governance Ledger (acquires startup lock)...');
  GovernanceLedger.init();

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

  const initialLedger = GovernanceLedger.loadLedger();
  console.log(`  - Genesis initialized. Initial local size: ${initialLedger.length} block.`);

  // Stop background timers to prevent background sync/heartbeat interfering with the manual multi-writer chaos simulation
  GovernanceLedger.stopBackgroundTasks();

  // 3. Process A acquires the lock
  console.log('\n[TEST] Writer Process A acquiring active lock...');
  await GovernanceLedger.acquireLockAsync();
  const genA = GovernanceLedger.activeLockGeneration;
  console.log(`  - Process A acquired lock successfully. Active Generation Token: ${genA}`);

  // 4. Simulate a long-running GC pause on Process A, or VM suspension.
  // In the meantime, the lease expires or B discovers A's lock is stale.
  // We simulate Process B forcefully hijacking the lock:
  console.log('\n[TEST] Writer Process B detects stale lock and forcefully steals lock...');
  
  // We simulate B cleaning up the lock file and acquiring the lock
  if (fs.existsSync(LOCK_FILE)) {
    fs.unlinkSync(LOCK_FILE);
  }
  await db.$executeRawUnsafe('TRUNCATE TABLE "ZtanActiveLease";');
  
  // Now Process B acquires the lock. We do this by temporarily running acquireLockAsync
  // We simulate B's instance by mocking process state or simply running acquireLockAsync again.
  // Since we reset process.pid mock is not needed because the generator increments.
  const originalPid = process.pid;
  
  // Temporarily mock process.pid to simulate a different process (Process B)
  Object.defineProperty(process, 'pid', { value: 99999, configurable: true });
  
  await GovernanceLedger.acquireLockAsync();
  const genB = GovernanceLedger.activeLockGeneration;
  console.log(`  - Process B acquired lock successfully. Owner PID: 99999, Generation Token: ${genB}`);
  
  // Assert generation has monotonically strictly increased!
  if (genB === null || genA === null || genB <= genA) {
    console.error(`[FAIL] Monotonic fencing token did not increment. Gen A: ${genA}, Gen B: ${genB}`);
    process.exit(1);
  }
  console.log(`  - ✅ PASS: Monotonic lease generation successfully incremented (Token: ${genB} > ${genA})`);

  // Restore original process.pid to restore parent state
  Object.defineProperty(process, 'pid', { value: originalPid, configurable: true });

  // 5. Process A wakes up from its GC pause and attempts to write to the ledger!
  console.log('\n[TEST] Suspended Process A wakes up and attempts a zombie write append (using Gen A)...');
  
  // We manually restore Process A's active generation token in local memory to simulate its state
  GovernanceLedger.activeLockGeneration = genA;

  let writeSucceeded = false;
  let fencingExceptionThrown = false;
  try {
    // Process A tries to call saveLedger directly, simulating waking up inside critical write block
    GovernanceLedger.saveLedger([]);
    writeSucceeded = true;
  } catch (err: any) {
    fencingExceptionThrown = true;
    console.log(`  - Intercepted Fencing Exception: "${err.message}"`);
    if (err.message.includes('Fencing Active Lock Violation')) {
      console.log('  - ✅ PASS: Zombie writer successfully fenced off using monotonic lease token!');
    } else {
      console.error(`[FAIL] Unexpected exception thrown: ${err.message}`);
      process.exit(1);
    }
  }

  if (writeSucceeded) {
    console.error('[FAIL] Zombie write succeeded! Timeline fractured!');
    process.exit(1);
  }

  // 6. Verify that the local ledger file was NOT mutated by the zombie process
  console.log('\n[TEST] Auditing ledger state for timeline purity...');
  const currentLedger = GovernanceLedger.loadLedger();
  const containsZombieWrite = currentLedger.some(e => e.payload.includes('ZTAN-ZOMBIE-WRITE'));
  if (containsZombieWrite) {
    console.error('[FAIL] Zombie write found in local ledger!');
    process.exit(1);
  }
  console.log('  - ✅ PASS: Local ledger is completely pristine and un-mutated.');

  // 7. Verify lock ownership was NOT released or cleared by Process A's lock release trigger
  console.log('\n[TEST] Verifying lock ownership wasn\'t released by Process A...');
  
  // We call releaseLock to simulate Process A's finally-block release attempt
  GovernanceLedger.releaseLock();
  
  // Verify lock file STILL exists and is STILL owned by Process B (PID 99999, Gen B)
  if (!fs.existsSync(LOCK_FILE)) {
    console.error('[FAIL] Lock file was deleted by Process A during lock release!');
    process.exit(1);
  }
  
  const rawLock = fs.readFileSync(LOCK_FILE, 'utf8');
  const finalMeta = JSON.parse(rawLock);
  if (finalMeta.pid !== 99999 || finalMeta.generation !== genB) {
    console.error('[FAIL] Lock file metadata corrupted or modified.');
    process.exit(1);
  }
  console.log('  - ✅ PASS: Lock remains exclusively owned by Process B (PID: 99999, Gen B). Zombie release prevented.');

  console.log("\n=========================================================================");
  console.log("✅ ZTAN Monotonic Lease Fencing & Zombie Prevention PASSED.");
  console.log("=========================================================================");
  
  // Clean up lock file dynamically to leave system pristine
  if (fs.existsSync(LOCK_FILE)) {
    fs.unlinkSync(LOCK_FILE);
  }
  
  process.exit(0);
}

runLeaseFencingValidation().catch(err => {
  console.error('[FAIL] Critical failure in lease fencing validation:', err);
  process.exit(1);
});
