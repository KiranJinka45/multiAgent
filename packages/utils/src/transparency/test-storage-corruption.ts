import { GovernanceLedger } from '../governance-ledger.js';
import { db } from '@packages/db';
import fs from 'node:fs';
import * as path from 'node:path';

async function runStorageCorruptionValidation() {
  console.log("=========================================================================");
  console.log("  ZTAN v1.5.0 Storage-Layer Corruption & Write-Failure Validation Suite  ");
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

  // Wait for Genesis sync
  let genesisSynced = false;
  for (let i = 0; i < 30; i++) {
    const dbCount = await db.ztanLedgerBlock.count();
    if (dbCount >= 1) {
      genesisSynced = true;
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  if (!genesisSynced) {
    console.error('[FAIL] Genesis block did not sync.');
    process.exit(1);
  }

  // 3. Append legitimate entries
  console.log('[TEST] Appending legitimate block entries...');
  const entry1 = await GovernanceLedger.appendEntry(
    'POLICY',
    'ZTAN-POLICY: Operator set restricted to institutional list.',
    'ZTAN-SUPER-01',
    'VERIFIED',
    '105'
  );
  console.log(`  - Entry created (Seq: ${entry1.sequenceId}). Hash: ${entry1.hash}`);

  // 4. Drill 1: Physical torn-sector JSON truncation
  console.log('\n[TEST 1] Simulating physical torn-sector file truncation / corruption on governance_ledger.json...');
  const ledgerFilePath = path.join(ledgerDir, 'governance_ledger.json');
  const originalLedgerContent = fs.readFileSync(ledgerFilePath, 'utf8');

  // Corrupt the ledger by breaking the JSON array structure
  const corruptedContent = originalLedgerContent.substring(0, originalLedgerContent.length - 25);
  fs.writeFileSync(ledgerFilePath, corruptedContent, 'utf8');
  console.log('  - Injected broken truncated file contents into local ledger.');

  // Run verifyLedger and assert it catches the corruption
  console.log('[TEST 1] Auditing corrupted local ledger file...');
  const auditResult = GovernanceLedger.verifyLedger();
  if (auditResult.valid) {
    console.error('[FAIL] verifyLedger claimed a physically truncated JSON ledger is valid!');
    process.exit(1);
  }
  console.log(`  - ✅ PASS: Verification successfully caught corruption! Error: "${auditResult.error}"`);

  // Restore pristine state
  fs.writeFileSync(ledgerFilePath, originalLedgerContent, 'utf8');
  console.log('  - Restored ledger file back to pristine content.');

  // 5. Drill 2: Disk Full (ENOSPC) Write Fail-Closed Fencing
  console.log('\n[TEST 2] Simulating Disk-Full (ENOSPC) error during block append...');
  
  // Directly mock saveLedger to simulate absolute disk write failure
  const originalSaveLedger = GovernanceLedger.saveLedger;
  
  GovernanceLedger.saveLedger = (entries: any) => {
    const err = new Error('ENOSPC: no space left on device, write');
    (err as any).code = 'ENOSPC';
    throw err;
  };

  console.log('[TEST 2] Attempting block append under Simulated disk full condition...');
  let writeSucceeded = false;
  let exceptionThrown = false;
  
  try {
    await GovernanceLedger.appendEntry(
      'TELEMETRY',
      'ZTAN-HEARTBEAT: Health metrics check.',
      'SYSTEM',
      'VERIFIED',
      '105'
    );
    writeSucceeded = true;
  } catch (err: any) {
    exceptionThrown = true;
    console.log(`  - Intercepted Write Exception: "${err.message}"`);
    if (err.code === 'ENOSPC' || err.message.includes('ENOSPC')) {
      console.log('  - ✅ PASS: Write failure caught cleanly.');
    } else {
      console.error(`[FAIL] Unexpected exception thrown: ${err.message}`);
      process.exit(1);
    }
  }

  // Restore mock
  GovernanceLedger.saveLedger = originalSaveLedger;

  if (writeSucceeded) {
    console.error('[FAIL] Block append succeeded despite mocked disk exhaustion! Timeline state is uncertain.');
    process.exit(1);
  }

  // Verify self-fencing and fail-closed integrity
  console.log('[TEST 2] Auditing ledger after simulated write failure...');
  const postFailureAudit = GovernanceLedger.verifyLedger();
  if (!postFailureAudit.valid) {
    console.error(`[FAIL] Write failure caused ledger instability: ${postFailureAudit.error}`);
    process.exit(1);
  }
  console.log('  - ✅ PASS: Ledger remains completely stable and un-fractured. Consistency preserved.');

  console.log("\n=========================================================================");
  console.log("✅ ZTAN Storage-Layer Corruption & Fail-Closed Validation PASSED.");
  console.log("=========================================================================");
  process.exit(0);
}

runStorageCorruptionValidation().catch((err) => {
  console.error('[FAIL] Critical failure in storage corruption validation:', err);
  process.exit(1);
});
