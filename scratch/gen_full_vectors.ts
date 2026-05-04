import { ThresholdBls } from './packages/ztan-crypto/src/index';
import * as fs from 'fs';

async function main() {
  const vectors: any[] = [];

  // 1. Complex Vector
  const v1 = {
    name: "RFC-001 v1.4 Complex Vector",
    auditId: "RFC-COMPLEX-🎉-V1.4",
    timestamp: 1710000000000,
    payloadHash: "7289f43e1d3e4b5a6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b",
    threshold: 2,
    nodeIds: ["Node-C", "Node-A", "Node-B"]
  };
  const h1 = ThresholdBls.buildCanonicalPayload(v1.auditId, v1.timestamp, v1.payloadHash, v1.threshold, v1.nodeIds);
  vectors.push({
    name: v1.name,
    type: "SUCCESS",
    input: v1,
    expectedHash: h1.canonicalHashHex
  });

  // 2. Unicode Normalization
  const v2 = {
    name: "Unicode Normalization & Case Invariance",
    auditId: "NFC-TEST-é",
    timestamp: 1710000000000,
    payloadHash: "00".repeat(32),
    threshold: 1,
    nodeIds: ["Node-1"]
  };
  const h2 = ThresholdBls.buildCanonicalPayload(v2.auditId, v2.timestamp, v2.payloadHash, v2.threshold, v2.nodeIds);
  vectors.push({
    name: v2.name,
    type: "SUCCESS",
    input: v2,
    expectedHash: h2.canonicalHashHex
  });

  // 3. TSS Parity
  const v3 = {
    name: "TSS Threshold Aggregate Parity",
    auditId: "TSS-PARITY-TEST",
    timestamp: 1710000000000,
    nodeIds: ["SEC-GOV-01", "SRE-AUDIT-02", "TRUST-NODE-03"],
    threshold: 2,
    payloadHash: h1.canonicalHashHex
  };
  const h3 = ThresholdBls.buildCanonicalPayload(v3.auditId, v3.timestamp, v3.payloadHash, v3.threshold, v3.nodeIds);
  
  // Use simulated secrets for reproducibility
  // In ThresholdBls.dkg, it's random, so we'll just run it once and record.
  const { masterPublicKey, shares } = await ThresholdBls.dkg(v3.threshold, v3.nodeIds.length, v3.nodeIds);
  
  const sig1 = await ThresholdBls.signShare(h3.canonicalHashHex, shares[0].secretShare);
  const sig2 = await ThresholdBls.signShare(h3.canonicalHashHex, shares[1].secretShare);
  const aggSig = await ThresholdBls.aggregate([sig1, sig2]);

  vectors.push({
    name: v3.name,
    type: "SUCCESS",
    input: v3,
    expectedHash: h3.canonicalHashHex,
    expectedMasterPk: masterPublicKey,
    expectedSignature: aggSig
  });

  console.log(JSON.stringify({ version: "1.4", vectors }, null, 2));
}

main();
