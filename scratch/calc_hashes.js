const crypto = require('crypto');
const bls = require('@noble/bls12-381');

const DST = 'BLS_SIG_ZTAN_AUDIT_V1';

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
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function main() {
  const v1_hash = "a2d7ef152e03496365f827cdbb193e355b8e3a8c1288fd274dd54c6d44347a41";
  const v3_hash = "e8bebb06cb303e0d09131a289ec1048a360817cd82d44a92c2c06df51a2f9f69";

  // Use fixed private keys for reproducibility
  // Node.js Noble BLS sign expects a 32-byte Uint8Array/Buffer or bigint/string hex
  const sk1 = "0000000000000000000000000000000000000000000000000000000000000001";
  const sk2 = "0000000000000000000000000000000000000000000000000000000000000002";
  
  const pk1 = bls.getPublicKey(sk1);
  const pk2 = bls.getPublicKey(sk2);
  
  const sig1 = await bls.sign(Buffer.from(v3_hash, 'hex'), sk1, { dst: DST });
  const sig2 = await bls.sign(Buffer.from(v3_hash, 'hex'), sk2, { dst: DST });
  
  const masterPk = bls.aggregatePublicKeys([pk1, pk2]);
  const aggSig = bls.aggregateSignatures([sig1, sig2]);

  console.log(`Master PK: ${Buffer.from(masterPk).toString('hex')}`);
  console.log(`Aggregated Signature: ${Buffer.from(aggSig).toString('hex')}`);
}

main();
