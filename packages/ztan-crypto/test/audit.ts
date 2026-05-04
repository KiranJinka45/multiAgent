import { ThresholdCrypto } from '../src/index';
import * as fs from 'fs';
import * as path from 'path';

async function runAudit() {
  console.log('--- ZTAN NODE.JS AUDIT SUITE (v1.4) ---');
  
  const vectorsPath = path.join(__dirname, 'vectors.json');
  if (!fs.existsSync(vectorsPath)) {
    console.error('✖ FATAL: vectors.json not found');
    process.exit(1);
  }
  
  const { vectors } = JSON.parse(fs.readFileSync(vectorsPath, 'utf-8'));

  let failed = 0;

  for (const v of vectors) {
    console.log(`\n[TEST] ${v.name}`);
    try {
      const { canonicalHashHex } = ThresholdCrypto.buildCanonicalPayload(
        v.input.auditId,
        v.input.timestamp,
        v.input.payloadHash,
        v.input.threshold,
        v.input.nodeIds
      );

      if (v.type === 'FAILURE') {
        console.error(`  ✖ FAIL: Expected failure but got hash ${canonicalHashHex}`);
        failed++;
      } else {
        console.log(`  ✔ SUCCESS: Hash = ${canonicalHashHex}`);
        if (v.expectedHash && canonicalHashHex !== v.expectedHash) {
           console.error(`  ✖ PARITY ERROR: Expected ${v.expectedHash}`);
           failed++;
        }
      }
    } catch (e: any) {
      if (v.type === 'FAILURE') {
        const matches = e.message.includes(v.error) || v.error === "";
        if (matches) {
           console.log(`  ✔ CORRECTLY REJECTED: ${e.message}`);
        } else {
           console.error(`  ✖ ERROR MISMATCH: Expected "${v.error}", got "${e.message}"`);
           failed++;
        }
      } else {
        console.error(`  ✖ UNEXPECTED FAILURE: ${e.message}`);
        failed++;
      }
    }
  }

  // --- STRESS TEST (PHASE 4) ---
  console.log('\n[TEST] Large Input Stress (1024 Nodes, 1MB AuditId)');
  try {
    const largeAuditId = 'A'.repeat(1024 * 1024);
    const largeNodeIds = Array.from({ length: 1024 }, (_, i) => `Node-${i.toString().padStart(4, '0')}`);
    const start = Date.now();
    const { canonicalHashHex } = ThresholdCrypto.buildCanonicalPayload(
      largeAuditId,
      Date.now(),
      "00".repeat(32),
      1,
      largeNodeIds
    );
    console.log(`  ✔ SUCCESS: Processed in ${Date.now() - start}ms (Hash: ${canonicalHashHex.slice(0, 16)}...)`);
  } catch (e: any) {
    console.error(`  ✖ STRESS TEST FAILED: ${e.message}`);
    failed++;
  }
  
  const total = vectors.length + 1;
  const passed = total - failed;
  console.log(`\n--- AUDIT FINAL: ${passed}/${total} PASSED ---`);
  if (failed > 0) {
    console.error(`✖ AUDIT FAILED WITH ${failed} ERRORS`);
    process.exit(1);
  }
  console.log('✔ AUDIT PASSED CLEANLY');
}

runAudit();
