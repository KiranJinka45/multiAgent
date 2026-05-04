import { ThresholdCrypto } from '../../../packages/ztan-crypto/src/index';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

async function runFuzzer() {
  console.log('--- ZTAN CROSS-RUNTIME DETERMINISM VALIDATION (100 CASES) ---');
  
  const cases: any[] = [];
  
  // 1. Edge Case Generator
  for (let i = 0; i < 100; i++) {
    const payload: any = {
      version: 'ZTAN_CANONICAL_V1',
      auditId: `FUZZ-${i}-${Math.random().toString(36).substring(7).toUpperCase()}`,
      timestamp: Date.now() + i,
      payloadHash: '8f92b4e28f92b4e28f92b4e28f92b4e28f92b4e28f92b4e28f92b4e28f92b4e2',
      threshold: 2 + (i % 3),
      nodeIds: ['nodeA', 'nodeB', 'nodeC', `node-Extra-${i}`]
    };

    // Add noise/entropy
    if (i % 5 === 0) payload.metadata = { unicode: '🚀 审计 🛡️', nested: { val: i } };
    if (i % 3 === 0) payload.nodeIds = payload.nodeIds.reverse(); // Disordered
    
    // Boundary Test: Large ID
    if (i === 99) {
        payload.auditId = "A".repeat(1024); // 1KB
        payload.nodeIds.push("B".repeat(255)); // Max nodeId
    }

    cases.push(payload);
  }

  // 2. Unicode Decomposition Parity Check (Adversarial)
  console.log('--- VERIFYING UNICODE DECOMPOSITION PARITY ---');
  const unicode1 = "ZTAN-UNICODE-\u00E9"; // NFC: é
  const unicode2 = "ZTAN-UNICODE-e\u0301"; // NFD: e + ́
  
  const p1 = { ...cases[0], auditId: unicode1 };
  const p2 = { ...cases[0], auditId: unicode2 };
  
  const h1 = (await ThresholdCrypto.verifyAudit(JSON.stringify(p1), { skipMarkSeen: true })).canonicalHash;
  const h2 = (await ThresholdCrypto.verifyAudit(JSON.stringify(p2), { skipMarkSeen: true })).canonicalHash;
  
  if (h1 === h2) {
    console.log('✔ Unicode Parity Verified: NFC/NFD equivalence confirmed via RFC-compliant normalization');
  } else {
    console.error('✖ FATAL: Unicode Parity Failure. Normalization is non-deterministic.');
    process.exit(1);
  }

  // 3. Whitespace Collision Test (Adversarial - RFC-001 v1.2)
  console.log('--- VERIFYING WHITESPACE SEMANTIC PRESERVATION ---');
  const id1 = "AUDIT-1";
  const id2 = " AUDIT-1";
  
  const hW1 = (await ThresholdCrypto.verifyAudit(JSON.stringify({ ...cases[0], auditId: id1 }), { skipMarkSeen: true })).canonicalHash;
  const hW2 = (await ThresholdCrypto.verifyAudit(JSON.stringify({ ...cases[0], auditId: id2 }), { skipMarkSeen: true })).canonicalHash;
  
  if (hW1 !== hW2) {
    console.log('✔ Whitespace Integrity Verified: "ID" and " ID" produce distinct hashes');
  } else {
    console.error('✖ FATAL: Whitespace Collision. Semantic trimming detected.');
    process.exit(1);
  }

  // 4. Invalid UTF-8 (Lone Surrogates) Rejection
  console.log('--- VERIFYING INVALID UTF-8 REJECTION ---');
  const invalidStr = "BAD-\uD800-SURROGATE";
  const result = await ThresholdCrypto.verifyAudit(JSON.stringify({ ...cases[0], auditId: invalidStr }), { skipMarkSeen: true });
  
  if (result.status === 'FAILED') {
    console.log('✔ Invalid UTF-8 correctly rejected.');
  } else {
    console.error('✖ FATAL: Accepted lone surrogate string.');
    process.exit(1);
  }

  // 5. RFC Vector Validation (RFC-001 v1.3)
  console.log('--- VERIFYING RFC v1.3 TEST VECTOR ---');
  const rfcPayload = {
    version: 'ZTAN_CANONICAL_V1',
    auditId: 'RFC-TEST-V1.3',
    timestamp: 1714732800000,
    payloadHash: '8f92b4e28f92b4e28f92b4e28f92b4e28f92b4e28f92b4e28f92b4e28f92b4e2',
    threshold: 2,
    nodeIds: ['nodeA', 'nodeB']
  };
  const expectedHash = "6b0cfaedff2ec7a1f0feb8f66c2f826b05a6faa55014b44ffc96d01f9790aec2";
  const rfcResult = await ThresholdCrypto.verifyAudit(JSON.stringify(rfcPayload), { skipMarkSeen: true });
  if (rfcResult.canonicalHash === expectedHash) {
    console.log('✔ RFC v1.3 Test Vector Verified: Implementation matches published spec');
  } else {
    console.error(`✖ FATAL: RFC Vector Mismatch. Got ${rfcResult.canonicalHash}, Expected ${expectedHash}`);
    process.exit(1);
  }

  // 6. Unknown Version Rejection
  console.log('--- VERIFYING UNKNOWN VERSION REJECTION ---');
  const badVersion = { ...rfcPayload, version: 'ZTAN_CANONICAL_V2' };
  const verResult = await ThresholdCrypto.verifyAudit(JSON.stringify(badVersion), { skipMarkSeen: true });
  if (verResult.status === 'FAILED') {
    console.log('✔ Unknown versionTag correctly rejected.');
  } else {
    console.error('✖ FATAL: Accepted unknown versionTag.');
    process.exit(1);
  }

  // 7. Oversize Rejection (Audit ID)
  console.log('--- VERIFYING OVERSIZE FIELD REJECTION ---');
  const hugeId = "A".repeat(1024 * 1024 + 1); // 1MB + 1
  const hugeResult = await ThresholdCrypto.verifyAudit(JSON.stringify({ ...rfcPayload, auditId: hugeId }), { skipMarkSeen: true });
  if (hugeResult.status === 'FAILED') {
    console.log('✔ Oversize auditId correctly rejected.');
  } else {
    console.error('✖ FATAL: Accepted oversized auditId.');
    process.exit(1);
  }

  // 8. Complex Adversarial Vector Validation (RFC-001 v1.4)
  console.log('--- VERIFYING RFC v1.4 COMPLEX VECTOR (UNICODE + SORTING) ---');
  const complexPayload = {
    version: 'ZTAN_CANONICAL_V1',
    auditId: 'RFC-COMPLEX-🎉-V1.4',
    timestamp: 1714732800000,
    payloadHash: 'd41d8cd98f00b204e9800998ecf8427ed41d8cd98f00b204e9800998ecf8427e',
    threshold: 2,
    nodeIds: ['Node-C', 'Node-A', 'Node-B']
  };
  const expectedComplexHash = "7289f43e5f05ee3e51a1bec6fc5d3cd04b7fd40c315a1296ca4d10d4dd5ff402";
  const complexResult = await ThresholdCrypto.verifyAudit(JSON.stringify(complexPayload), { skipMarkSeen: true });
  if (complexResult.canonicalHash === expectedComplexHash) {
    console.log('✔ RFC v1.4 Complex Vector Verified: Sorting and Unicode handling match published spec');
  } else {
    console.error(`✖ FATAL: Complex Vector Mismatch. Got ${complexResult.canonicalHash}, Expected ${expectedComplexHash}`);
    process.exit(1);
  }

  // 9. NFC Duplicate Rejection
  console.log('--- VERIFYING NFC DUPLICATE REJECTION ---');
  const dupePayload = {
    ...rfcPayload,
    nodeIds: ["e\u0301", "é"] // Collide to same NFC form
  };
  const dupeResult = await ThresholdCrypto.verifyAudit(JSON.stringify(dupePayload), { skipMarkSeen: true });
  if (dupeResult.status === 'FAILED') {
    console.log('✔ Duplicate IDs after NFC correctly rejected.');
  } else {
    console.error('✖ FATAL: Accepted duplicate IDs after normalization.');
    process.exit(1);
  }

  let passed = 0;
  const bundleDir = path.join(__dirname, '../fuzz_bundles');
  if (!fs.existsSync(bundleDir)) fs.mkdirSync(bundleDir);

  for (const [index, auditData] of cases.entries()) {
    const rawInput = JSON.stringify(auditData);
    
    // Step 1: Node Verification & Bundle Export
    const initial = await ThresholdCrypto.verifyAudit(rawInput, { skipMarkSeen: true });
    
    const anchor = initial.finalAnchor!;
    const threshold = auditData.threshold;
    const partialSigs = await Promise.all(auditData.nodeIds.slice(0, threshold).map(async (id: string) => ({
      verifierId: id,
      signature: await ThresholdCrypto.signAnchor(anchor, id)
    })));

    const consensusInput = { ...auditData, partialAnchorSignatures: partialSigs, consensusThreshold: threshold };
    const finalResult = await ThresholdCrypto.verifyAudit(JSON.stringify(consensusInput), { skipMarkSeen: true });

    const bundle = {
      version: 'ZTAN_AUDIT_EVIDENCE_V1.1',
      input: { raw: rawInput, fingerprint: initial.inputHash },
      consensus: {
        status: finalResult.status,
        signatures: finalResult.signatureMetadata,
        threshold: threshold,
        payloadHash: finalResult.inputHash
      },
      integrity: {
        canonicalHash: finalResult.canonicalHash,
        finalAnchor: finalResult.finalAnchor,
        traceChain: finalResult.traceHashChain
      },
      reproducibility: {
        algorithms: { hashing: 'SHA-256', signatures: 'BLS12-381-AGG' },
        spec: 'ZTAN_CANONICAL_V1'
      }
    };

    const bundlePath = path.join(bundleDir, `fuzz-proof-${index}.json`);
    fs.writeFileSync(bundlePath, JSON.stringify(bundle, null, 2));

    // Step 2: Python Independent Verification
    try {
      execSync(`python auditor/auditor_verifier.py ${bundlePath}`, { stdio: 'pipe' });
      passed++;
      if (passed % 20 === 0) console.log(`Progress: ${passed}/100 cases verified across runtimes...`);
    } catch (e: any) {
      console.error(`✖ FUZZ CASE ${index} FAILED CROSS-RUNTIME VERIFICATION`);
      console.error(e.stdout.toString());
      console.error(e.stderr.toString());
      process.exit(1);
    }
  }

  console.log(`\n✔ VALIDATION SUCCESS: 100/100 cases verified (Node.js <-> Python)`);
  console.log('✔ All adversarial edge cases (Unicode, Reordering, Thresholds) passed byte-parity checks.');
  console.log('✔ Determinism validated across independent runtimes following ZTAN-RFC-001.');
}

runFuzzer().catch(console.error);
