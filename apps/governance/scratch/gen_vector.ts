import { ThresholdCrypto } from '../../../packages/ztan-crypto/src/index';

async function main() {
  const payload = {
    version: 'ZTAN_CANONICAL_V1',
    auditId: 'RFC-TEST-V1.3',
    timestamp: 1714732800000,
    payloadHash: '8f92b4e28f92b4e28f92b4e28f92b4e28f92b4e28f92b4e28f92b4e28f92b4e2',
    threshold: 2,
    nodeIds: ['nodeA', 'nodeB']
  };

  const { canonicalHashHex } = ThresholdCrypto.buildCanonicalPayload(
    payload.auditId,
    payload.timestamp,
    payload.payloadHash,
    payload.threshold,
    payload.nodeIds
  );

  console.log(`REFERENCE_HASH=${canonicalHashHex}`);
}

main().catch(console.error);
