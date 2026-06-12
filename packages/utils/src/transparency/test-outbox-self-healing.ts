process.env.ZTAN_PARTITIONS = '1';
import { GovernanceLedger } from '../governance-ledger.js';
import { db } from '@packages/db';
import * as fs from 'node:fs';
import * as path from 'node:path';

async function runOutboxSelfHealingValidation() {
  console.log("=========================================================================");
  console.log("  ZTAN v1.5.0 Transactional Outbox Self-Healing WAL Validation Suite    ");
  console.log("=========================================================================");

  // 1. Pristine reset
  console.log('[RESET] Setting up clean test workspaces...');
  await db.$executeRawUnsafe(`TRUNCATE TABLE "ZtanLedgerBlock", "ZtanWalLog", "ZtanSnapshot", "ZtanActiveLease", "ZtanPayloadAttestation", "ZtanQuarantineBlob", "IdempotencyRecord", "AuditLog" RESTART IDENTITY CASCADE;`);
  await db.$executeRawUnsafe(`TRUNCATE TABLE "ZtanWalLog" RESTART IDENTITY CASCADE;`);
  await db.$executeRawUnsafe(`TRUNCATE TABLE "AuditLog" RESTART IDENTITY CASCADE;`);
  
  const ledgerDir = path.join(process.cwd(), '.ztan-transparency');
  if (fs.existsSync(ledgerDir)) {
    try {
      fs.rmSync(ledgerDir, { recursive: true, force: true });
    } catch (_e) {
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
      cleanDir(ledgerDir);
    }
  }

  // 2. Initialize
  console.log('[TEST] Initializing Governance Ledger with clean startup ceremony...');
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

  // 3. Temporarily isolate database (simulate partition) and write entries to create queue
  console.log('\n[SIMULATION] Simulating network partition (Prisma offline)...');
  const originalTransaction = db.$transaction;
  const originalCreate = db.ztanLedgerBlock.create;
  const originalFindUnique = db.ztanLedgerBlock.findUnique;

  (db as any).$transaction = async (cb: any) => {
    return originalTransaction.call(db, async (tx: any) => {
      const txProxy = new Proxy(tx, {
        get(target, prop) {
          if (prop === 'ztanWalLog' || prop === 'ztanLedgerBlock') {
            throw new Error('PostgreSQL consensus layer is unreachable.');
          }
          return target[prop];
        }
      });
      return await cb(txProxy);
    });
  };
  (db.ztanLedgerBlock as any).create = async () => {
    throw new Error('PostgreSQL consensus layer is unreachable.');
  };
  (db.ztanLedgerBlock as any).findUnique = async () => {
    throw new Error('PostgreSQL consensus layer is unreachable.');
  };

  const _entry1 = await GovernanceLedger.appendEntry(
    'POLICY',
    'ZTAN-RESOLUTION: Cognitive Saturation Override Ceremony Authorized by Operator.',
    'ZTAN-OPERATOR-01',
    'VERIFIED'
  );
  const _entry2 = await GovernanceLedger.appendEntry(
    'TELEMETRY',
    'ZTAN-HEARTBEAT: Health metrics checked.',
    'SYSTEM',
    'VERIFIED'
  );

  const initialQueue = GovernanceLedger.loadOutbox();
  console.log(`  - Local writes queued. Current Outbox Queue elements: [${initialQueue.join(', ')}]`);

  // 4. Inject Physical WAL Corruption (broken JSON write)
  console.log('\n[TEST] Simulating physical WAL corruption on outbox_queue.json...');
  const outboxFilePath = path.join(ledgerDir, 'outbox_queue.json');
  fs.writeFileSync(outboxFilePath, '{"corrupted_data_torn_write_and_half_written_json_brackets: [1001, ', 'utf8');
  console.log('  - Wrote malformed, corrupted content directly to the outbox queue file.');

  // Restore DB delegates to allow self-healing to check against DB
  (db as any).$transaction = originalTransaction;
  db.ztanLedgerBlock.create = originalCreate;
  db.ztanLedgerBlock.findUnique = originalFindUnique;

  // 5. Trigger loadOutbox which should catch the error and fire background self-healing
  console.log('\n[TEST] Calling loadOutbox() to trigger automatic self-healing...');
  const corruptedLoad = GovernanceLedger.loadOutbox();
  console.log(`  - loadOutbox() returned baseline: [${corruptedLoad.join(', ')}]`);

  // Wait a moment for async background self-healing process to complete
  console.log('[TEST] Waiting for background self-healing reconstruction...');
  let selfHealed = false;
  for (let i = 0; i < 30; i++) {
    const freshQueue = GovernanceLedger.loadOutbox();
    const block1001 = await db.ztanLedgerBlock.findUnique({ where: { blockId: '1001' } }).catch(() => null);
    const block1002 = await db.ztanLedgerBlock.findUnique({ where: { blockId: '1002' } }).catch(() => null);

    const queueIsReconstructed = freshQueue.length === 2 && freshQueue.includes(1001) && freshQueue.includes(1002);
    const syncedToDb = block1001 !== null && block1002 !== null;

    if (queueIsReconstructed || syncedToDb) {
      selfHealed = true;
      console.log(`  - Self-healing completed successfully! (Queue reconstructed: ${queueIsReconstructed}, Synced to DB: ${syncedToDb})`);
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  if (!selfHealed) {
    console.error('[FAIL] Outbox self-healing worker did not reconstruct queue.');
    process.exit(1);
  }
  console.log('  - ✅ PASS: Broken JSON WAL durably reconstructed from authoritative ledger scan.');

  // 6. Flush recovered queue to DB consensus storage
  console.log('\n[TEST] Replicating self-healed outbox to PostgreSQL consensus storage...');
  await GovernanceLedger.processOutbox();

  const finalOutbox = GovernanceLedger.loadOutbox();
  console.log(`  - Final Outbox Queue size: ${finalOutbox.length} (Expected: 0)`);
  if (finalOutbox.length !== 0) {
    console.error('[FAIL] Reconciliation failed to process the recovered queue.');
    process.exit(1);
  }
  console.log('  - ✅ PASS: Recovered blocks flushed and synchronized perfectly.');

  // 7. DB verification
  const dbAudit = await GovernanceLedger.verifyDbLedger();
  console.log(`  - Database Audit Outcome: ${dbAudit.valid ? '✅ VALID' : '❌ INVALID'}`);
  console.log(`  - Audited Blocks in DB: ${dbAudit.count}`);
  if (!dbAudit.valid) {
    console.error(`[FAIL] Reconstructed database chain was corrupted: ${dbAudit.error}`);
    process.exit(1);
  }
  console.log('  - ✅ PASS: Database blockchain fully verified without any hash fractures.');

  console.log("\n=========================================================================");
  console.log("✅ ZTAN Outbox Self-Healing WAL Validation PASSED.");
  console.log("=========================================================================");
  process.exit(0);
}

runOutboxSelfHealingValidation().catch((err) => {
  console.error('[FAIL] Critical error in self-healing validation:', err);
  process.exit(1);
});
