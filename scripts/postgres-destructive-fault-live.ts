import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Set DATABASE_URL explicitly to connect to the resilience database container
process.env.DATABASE_URL = 'postgresql://postgres:password@localhost:54399/multiagent?schema=public';

function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

async function main() {
  console.log('================================================================');
  console.log('⚡ STARTING POSTGRESQL DESTRUCTIVE FAULT & TAMPERING CAMPAIGN');
  console.log('================================================================');

  const { scanLedgerMerkleChain } = await import('../tests/replay-parity-audit.js');
  const { injectDbOutage, clearDbOutage, db } = await import('../packages/db/src/index.js');

  const prisma = db;

  const metrics = {
    step1_ledgerSeeded: false,
    step2_initialAuditPass: false,
    step3_tamperingDetected: false,
    step4_diskFullFailClosed: false,
    finalVerdict: 'FAILED'
  };

  try {
    // -------------------------------------------------------------------------
    // Step 1: Initialize and seed healthy ledger chain
    // -------------------------------------------------------------------------
    console.log('\nStep 1: Preparing database and seeding healthy block chain...');
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "ZtanLedgerBlock" RESTART IDENTITY CASCADE;`);
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "ZtanWalLog" RESTART IDENTITY CASCADE;`);

    const operator = 'steward_omega';
    const genesisPrevHash = 'sha256:0000000000000000000000000000000000000000000000000000000000000000';
    const genesisPayload = '{"genesis":true}';
    const genesisHash = sha256('canonical-block-0' + genesisPrevHash + genesisPayload + operator);

    await prisma.ztanLedgerBlock.create({
      data: {
        blockId: 'canonical-block-0',
        prevHash: genesisPrevHash,
        hash: genesisHash,
        type: 'GENESIS',
        payload: genesisPayload,
        operator,
        signature: 'sig_genesis',
        status: 'VERIFIED',
        epoch: '1'
      }
    });

    const block1Payload = '{"tx":1}';
    const block1Hash = sha256('canonical-block-1' + genesisHash + block1Payload + operator);

    await prisma.ztanLedgerBlock.create({
      data: {
        blockId: 'canonical-block-1',
        prevHash: genesisHash,
        hash: block1Hash,
        type: 'TX_BATCH',
        payload: block1Payload,
        operator,
        signature: 'sig_block_1',
        status: 'VERIFIED',
        epoch: '1'
      }
    });

    const block2Payload = '{"tx":2}';
    const block2Hash = sha256('canonical-block-2' + block1Hash + block2Payload + operator);

    await prisma.ztanLedgerBlock.create({
      data: {
        blockId: 'canonical-block-2',
        prevHash: block1Hash,
        hash: block2Hash,
        type: 'TX_BATCH',
        payload: block2Payload,
        operator,
        signature: 'sig_block_2',
        status: 'VERIFIED',
        epoch: '1'
      }
    });

    console.log('   ✅ Valid 3-block ledger chain successfully written to storage.');
    metrics.step1_ledgerSeeded = true;

    // -------------------------------------------------------------------------
    // Step 2: Validate baseline health
    // -------------------------------------------------------------------------
    console.log('\nStep 2: Performing baseline Merkle chain audit...');
    const auditReport = await scanLedgerMerkleChain(prisma);
    console.log(`   - Baseline Audit Success: ${auditReport.success}`);
    console.log(`   - Total Checked: ${auditReport.totalBlocksChecked}`);

    if (auditReport.success && auditReport.totalBlocksChecked === 3) {
      console.log('   ✅ Baseline audit passed nominally.');
      metrics.step2_initialAuditPass = true;
    } else {
      throw new Error('Baseline chain verification failed.');
    }

    // -------------------------------------------------------------------------
    // Step 3: Inject direct database tampering
    // -------------------------------------------------------------------------
    console.log('\nStep 3: Simulating direct database tampering (mutating Block 1 hash)...');
    await prisma.$executeRawUnsafe(`
      UPDATE "ZtanLedgerBlock"
      SET "hash" = 'compromised_tampered_hash_value'
      WHERE "blockId" = 'canonical-block-1';
    `);
    console.log('   - Mutated block hash directly via raw SQL.');

    const corruptedAudit = await scanLedgerMerkleChain(prisma);
    console.log(`   - Tampered Audit Success: ${corruptedAudit.success}`);
    console.log(`   - Errors Logged: ${corruptedAudit.errors.length}`);
    corruptedAudit.errors.forEach(err => console.log(`     🚨 ${err}`));

    if (!corruptedAudit.success && corruptedAudit.errors.length > 0) {
      console.log('   ✅ Tampering successfully detected. Quarantine protocols activated.');
      metrics.step3_tamperingDetected = true;
    } else {
      throw new Error('Database tampering was not detected by the auditor!');
    }

    // Restore block hash to healthy state
    await prisma.$executeRawUnsafe(`
      UPDATE "ZtanLedgerBlock"
      SET "hash" = '${block1Hash}'
      WHERE "blockId" = 'canonical-block-1';
    `);
    console.log('   - Restored Block 1 hash back to its valid cryptographic signature.');

    // -------------------------------------------------------------------------
    // Step 4: Inject storage disk full pathology
    // -------------------------------------------------------------------------
    console.log('\nStep 4: Injecting database disk-full pathology...');
    injectDbOutage(10000, 'disk-full');
    console.log('   - Outage state set to disk-full.');

    try {
      console.log('   - Attempting write operation during disk full...');
      await prisma.ztanLedgerBlock.create({
        data: {
          blockId: 'canonical-block-failed-write',
          prevHash: block2Hash,
          hash: 'invalid',
          type: 'TX_BATCH',
          payload: '{"failed":true}',
          operator,
          signature: 'sig',
          status: 'VERIFIED',
          epoch: '1'
        }
      });
      console.error('   ❌ ERROR: Write operation unexpectedly succeeded during disk exhaustion!');
    } catch (err: any) {
      console.log(`   ✅ NOMINAL: Write failed with expected error: ${err.message}`);
      if (err.message.includes('No space left on device')) {
        metrics.step4_diskFullFailClosed = true;
      }
    }

    // Clear outages
    clearDbOutage();
    console.log('   - Pathology cleared.');

    if (
      metrics.step1_ledgerSeeded &&
      metrics.step2_initialAuditPass &&
      metrics.step3_tamperingDetected &&
      metrics.step4_diskFullFailClosed
    ) {
      metrics.finalVerdict = 'PASSED';
      console.log('\n✅ ALL DRILL SCENARIOS PASSED NOMINALLY.');
    }

  } catch (err: any) {
    console.error(`\n❌ Drill execution failed: ${err.message}`);
  } finally {
    clearDbOutage();
    await prisma.$disconnect();
  }

  // Write campaign results
  const reportPath = path.join(rootDir, 'telemetry-history', 'destructive_fault_latest.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    metrics,
  }, null, 2), 'utf-8');

  console.log('================================================================');
  console.log(`🏁 DRILL FINISHED. Verdict: ${metrics.finalVerdict}`);
  console.log('================================================================');
  process.exit(metrics.finalVerdict === 'PASSED' ? 0 : 1);
}

main().catch(err => {
  console.error(`Fatal crash: ${err.message}`);
  process.exit(1);
});
