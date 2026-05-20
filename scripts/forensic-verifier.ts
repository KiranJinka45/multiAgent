import { GovernanceLedger } from '../packages/utils/src/governance-ledger';
import { db } from '@packages/db';
import * as fs from 'node:fs';
import * as path from 'node:path';

const AUDIT_DIR = path.join(process.cwd(), '.planning', 'telemetry');
const REPORT_PATH = path.join(AUDIT_DIR, 'forensic-audit-latest.json');

async function executeForensicVerification() {
  console.log("=========================================================================");
  console.log("📡 ZTAN SOVEREIGN LEDGER FORENSIC VERIFIER & PARITY EXPORTER");
  console.log("=========================================================================");

  if (!fs.existsSync(AUDIT_DIR)) {
    fs.mkdirSync(AUDIT_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString();
  let localOutcome: any = { valid: false, error: 'Unexecuted' };
  let dbOutcome: any = { valid: false, error: 'Unexecuted' };
  let chainParity: 'SYNCHRONIZED' | 'DIVERGED' | 'PARTITIONED' = 'PARTITIONED';
  let discrepancies: string[] = [];

  // 1. Audit Local Cryptographic Ledger
  console.log("\n[1] Auditing Local Chained Ledger File...");
  try {
    const start = Date.now();
    const result = GovernanceLedger.verifyLedger();
    const duration = Date.now() - start;
    
    if (result.valid) {
      console.log(`   - Local Ledger Validation: ✅ VALID (Audited in ${duration}ms)`);
      localOutcome = { valid: true, durationMs: duration };
    } else {
      console.error(`   - Local Ledger Validation: ❌ INVALID!`);
      console.error(`     Error: ${result.error} at index ${result.tamperedIndex}`);
      localOutcome = { valid: false, error: result.error, tamperedIndex: result.tamperedIndex, durationMs: duration };
      discrepancies.push(`Local chain fracture: ${result.error} at index ${result.tamperedIndex}`);
    }
  } catch (err: any) {
    console.error(`   - Local Ledger Audit Failed: ${err.message || err}`);
    localOutcome = { valid: false, error: err.message || String(err) };
    discrepancies.push(`Local audit failure: ${err.message || err}`);
  }

  // 2. Audit PostgreSQL Consensus Database Ledger
  console.log("\n[2] Auditing PostgreSQL Replicated Blockchain Table...");
  try {
    const start = Date.now();
    const result = await GovernanceLedger.verifyDbLedger();
    const duration = Date.now() - start;

    if (result.valid) {
      console.log(`   - PostgreSQL Ledger Validation: ✅ VALID (Audited in ${duration}ms)`);
      console.log(`     Block Count: ${result.count}`);
      console.log(`     Outbox Status: Length = ${result.outboxLength}, Sync Parity = ${result.synchronized}`);
      dbOutcome = { 
        valid: true, 
        count: result.count, 
        outboxLength: result.outboxLength, 
        synchronized: result.synchronized,
        durationMs: duration 
      };
    } else {
      console.error(`   - PostgreSQL Ledger Validation: ❌ INVALID!`);
      console.error(`     Error: ${result.error}`);
      dbOutcome = { valid: false, error: result.error, durationMs: duration };
      discrepancies.push(`PostgreSQL chain fracture: ${result.error}`);
    }
  } catch (err: any) {
    console.error(`   - PostgreSQL Ledger Audit Failed: ${err.message || err}`);
    dbOutcome = { valid: false, error: err.message || String(err) };
    discrepancies.push(`Database audit failure: ${err.message || err}`);
  }

  // 3. Compute Parity Drift
  console.log("\n[3] Evaluating Authoritative Local-to-consensus Parity...");
  if (localOutcome.valid && dbOutcome.valid) {
    const localLedger = GovernanceLedger.loadLedger();
    try {
      const dbBlocks = await db.ztanLedgerBlock.findMany();
      dbBlocks.sort((a, b) => parseInt(a.blockId, 10) - parseInt(b.blockId, 10));

      const localSeqIds = localLedger.map(e => e.sequenceId);
      const dbSeqIds = dbBlocks.map(e => parseInt(e.blockId, 10));

      // Check alignment of sequence IDs
      const missingInDb = localSeqIds.filter(id => !dbSeqIds.includes(id));
      const orphanInDb = dbSeqIds.filter(id => !localSeqIds.includes(id));

      if (missingInDb.length === 0 && orphanInDb.length === 0) {
        // Full matching length, verify hash matching
        let hashDriftCount = 0;
        for (let i = 0; i < localLedger.length; i++) {
          const dbMatch = dbBlocks.find(b => parseInt(b.blockId, 10) === localLedger[i].sequenceId);
          if (dbMatch && dbMatch.hash !== localLedger[i].hash) {
            hashDriftCount++;
            discrepancies.push(`Byzantine divergence at sequence ${localLedger[i].sequenceId}: Local Hash (${localLedger[i].hash}) vs DB Hash (${dbMatch.hash})`);
          }
        }

        if (hashDriftCount === 0) {
          chainParity = 'SYNCHRONIZED';
          console.log("   - Parity Metric: ✅ PERFECTLY SYNCHRONIZED (0 blocks drift)");
        } else {
          chainParity = 'DIVERGED';
          console.error(`   - Parity Metric: ❌ DIVERGED! ${hashDriftCount} blocks possess divergent hash values.`);
        }
      } else {
        if (dbOutcome.synchronized) {
          chainParity = 'DIVERGED';
          console.error(`   - Parity Metric: ❌ DIVERGED! Local and DB blocks are out of bounds (DB has orphan blocks or is missing blocks despite clean outbox).`);
        } else {
          chainParity = 'PARTITIONED';
          console.log(`   - Parity Metric: ⚠️ PARTITIONED (Outbox has ${missingInDb.length} unsynced local blocks in queue)`);
        }
        if (missingInDb.length > 0) {
          discrepancies.push(`Consensus DB is missing ${missingInDb.length} authoritative blocks: ${JSON.stringify(missingInDb)}`);
        }
        if (orphanInDb.length > 0) {
          discrepancies.push(`Orphan blocks found in PostgreSQL database that are missing from authoritative file: ${JSON.stringify(orphanInDb)}`);
        }
      }
    } catch (e: any) {
      console.error(`   - Failed to compute exact parity: ${e.message || e}`);
      discrepancies.push(`Parity calculation exception: ${e.message || e}`);
    }
  } else {
    console.error("   - Parity Metric: ❌ UNABLE TO CALCULATE (Verification components failed)");
  }

  // 4. Save Forensic Export Payload
  const exportPayload = {
    timestamp,
    verdict: discrepancies.length === 0 ? 'VERIFIED' : 'DEGRADED',
    chainParity,
    localOutcome,
    dbOutcome,
    discrepancies,
    authoritativeLedgerLength: localOutcome.valid ? GovernanceLedger.loadLedger().length : 0
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(exportPayload, null, 2), 'utf8');
  console.log(`\n💾 Certified Forensic Export saved to: ${REPORT_PATH}`);
  
  console.log("=========================================================================");
  console.log(`📊 FORENSIC AUDIT COMPLETED. VERDICT: ${exportPayload.verdict}`);
  console.log("=========================================================================\n");

  if (exportPayload.verdict === 'VERIFIED') {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

executeForensicVerification().catch(err => {
  console.error("Fatal exception during forensic verification:", err);
  process.exit(1);
});
