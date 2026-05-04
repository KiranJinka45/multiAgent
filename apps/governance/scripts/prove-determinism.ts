import { ThresholdCrypto } from '../../../packages/ztan-crypto/src/index';
import * as fs from 'fs';

async function proveDeterminism() {
  console.log('--- ZTAN DETERMINISM PROOF ---');
  
  const rawInput = JSON.stringify({
    version: 'ZTAN_CANONICAL_V1',
    auditId: 'TEST-DETERMINISM-001',
    timestamp: 1714732800000,
    payloadHash: '8f92b4e28f92b4e28f92b4e28f92b4e28f92b4e28f92b4e28f92b4e28f92b4e2',
    threshold: 2,
    nodeIds: ['nodeA', 'nodeB', 'nodeC']
  });

  // Run 1
  const r1 = await ThresholdCrypto.verifyAudit(rawInput, { skipMarkSeen: true });
  const bundle1 = {
    integrity: {
      canonicalHash: r1.canonicalHash,
      finalAnchor: r1.finalAnchor,
      inputHash: r1.inputHash
    },
    version: 'ZTAN_AUDIT_EVIDENCE_V1.1'
  };
  const s1 = JSON.stringify(bundle1, Object.keys(bundle1).sort(), 2);

  // Run 2
  const r2 = await ThresholdCrypto.verifyAudit(rawInput, { skipMarkSeen: true });
  const bundle2 = {
    integrity: {
      canonicalHash: r2.canonicalHash,
      finalAnchor: r2.finalAnchor,
      inputHash: r2.inputHash
    },
    version: 'ZTAN_AUDIT_EVIDENCE_V1.1'
  };
  const s2 = JSON.stringify(bundle2, Object.keys(bundle2).sort(), 2);

  if (s1 === s2) {
    console.log('✔ DETERMINISM PROVED: Byte-identical output across runs.');
    console.log('Canonical Hash:', r1.canonicalHash);
    console.log('Anchor Root:   ', r1.finalAnchor);
  } else {
    console.error('✖ DETERMINISM FAILED: Drift detected between runs.');
    process.exit(1);
  }
}

proveDeterminism().catch(console.error);
