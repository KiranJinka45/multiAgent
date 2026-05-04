const bls = require('@noble/bls12-381');
const { sha256 } = require('@noble/hashes/sha256');
const crypto = require('crypto');

// Enforce noble-bls settings for ZTAN parity
bls.utils.setDST('BLS_SIG_ZTAN_AUDIT_V1');

function encodeField(bytes) {
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(bytes.length);
  return Buffer.concat([lenBuf, bytes]);
}

function encodeUint64BE(value) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(value));
  return buf;
}

function encodeUint32BE(value) {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(value);
  return buf;
}

function buildCanonicalPayload(auditId, timestamp, payloadHash, threshold, nodeIds) {
  const versionTag = Buffer.from('ZTAN_CANONICAL_V1', 'utf-8');
  const auditIdBytes = Buffer.from(auditId, 'utf-8');
  const payloadHashBytes = Buffer.from(payloadHash, 'hex');
  
  const normalizedNodes = nodeIds.map(id => Buffer.from(id.normalize('NFC'), 'utf-8'));
  normalizedNodes.sort(Buffer.compare);
  
  const bufferParts = [
    encodeField(versionTag),
    encodeField(auditIdBytes),
    encodeUint64BE(timestamp),
    encodeField(payloadHashBytes),
    encodeUint32BE(threshold),
    encodeUint32BE(normalizedNodes.length)
  ];
  
  for (const node of normalizedNodes) {
    bufferParts.push(encodeField(node));
  }
  
  const buffer = Buffer.concat(bufferParts);
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  return { hash, buffer };
}

async function main() {
  const vectors = [];

  // 1. Complex Vector
  const v1 = {
    name: "RFC-001 v1.4 Complex Vector",
    auditId: "RFC-COMPLEX-🎉-V1.4",
    timestamp: 1710000000000,
    payloadHash: "7289f43e1d3e4b5a6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b",
    threshold: 2,
    nodeIds: ["Node-C", "Node-A", "Node-B"]
  };
  const h1 = buildCanonicalPayload(v1.auditId, v1.timestamp, v1.payloadHash, v1.threshold, v1.nodeIds);
  vectors.push({
    name: v1.name,
    type: "SUCCESS",
    input: v1,
    expectedHash: h1.hash
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
  const h2 = buildCanonicalPayload(v2.auditId, v2.timestamp, v2.payloadHash, v2.threshold, v2.nodeIds);
  vectors.push({
    name: v2.name,
    type: "SUCCESS",
    input: v2,
    expectedHash: h2.hash
  });

  // 3. TSS Parity
  const v3 = {
    name: "TSS Threshold Aggregate Parity",
    auditId: "TSS-PARITY-TEST",
    timestamp: 1710000000000,
    nodeIds: ["SEC-GOV-01", "SRE-AUDIT-02", "TRUST-NODE-03"],
    threshold: 2,
    payloadHash: h1.hash // Use v1 hash as dummy payload
  };
  const h3 = buildCanonicalPayload(v3.auditId, v3.timestamp, v3.payloadHash, v3.threshold, v3.nodeIds);
  
  // Generate deterministic keys for the vector (using private key 1, 2, 3)
  const pk1 = 1n;
  const pk2 = 2n;
  const masterSk = pk1 + pk2; // Simple additive secret sharing (simulated)
  
  const pub1 = bls.getPublicKey(pk1);
  const pub2 = bls.getPublicKey(pk2);
  const masterPk = bls.getPublicKey(masterSk);
  
  const sig1 = await bls.sign(h3.hash, pk1);
  const sig2 = await bls.sign(h3.hash, pk2);
  const aggSig = bls.aggregateSignatures([sig1, sig2]);

  vectors.push({
    name: v3.name,
    type: "SUCCESS",
    input: v3,
    expectedHash: h3.hash,
    expectedMasterPk: Buffer.from(masterPk).toString('hex'),
    expectedSignature: Buffer.from(aggSig).toString('hex')
  });

  console.log(JSON.stringify({ version: "1.4", vectors }, null, 2));
}

main();
