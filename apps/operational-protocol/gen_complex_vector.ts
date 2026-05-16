import { ThresholdCrypto } from '../../packages/ztan-crypto/src/index';

async function main() {
  const payload = {
    version: 'ZTAN_CANONICAL_V1',
    auditId: 'RFC-COMPLEX-🎉-V1.4',
    timestamp: 1714732800000,
    payloadHash: 'd41d8cd98f00b204e9800998ecf8427e' + 'd41d8cd98f00b204e9800998ecf8427e', // 32 bytes
    threshold: 2,
    nodeIds: ['Node-C', 'Node-A', 'Node-B'] // Unsorted
  };

  const { canonicalHashHex, boundPayloadBytes } = ThresholdCrypto.buildCanonicalPayload(
    payload.auditId,
    payload.timestamp,
    payload.payloadHash,
    payload.threshold,
    payload.nodeIds
  );

  console.log(`COMPLEX_INPUT=${JSON.stringify(payload)}`);
  console.log(`COMPLEX_HEX=${Buffer.from(boundPayloadBytes).toString('hex')}`);
  console.log(`COMPLEX_HASH=${canonicalHashHex}`);
}

main().catch(console.error);
