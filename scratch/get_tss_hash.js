const { ThresholdCrypto } = require('./packages/ztan-crypto/src/index');

const input = {
  auditId: "TSS-PARITY-TEST",
  timestamp: 1710000000000,
  nodeIds: ["SEC-GOV-01", "SRE-AUDIT-02", "TRUST-NODE-03"],
  threshold: 2,
  payloadHash: "a2d7ef152e03496365f827cdbb193e355b8e3a8c1288fd274dd54c6d44347a41"
};

const { canonicalHashHex } = ThresholdCrypto.buildCanonicalPayload(
  input.auditId,
  input.timestamp,
  input.payloadHash,
  input.threshold,
  input.nodeIds
);

console.log("Canonical Hash:", canonicalHashHex);
