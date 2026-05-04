const { ThresholdBls } = require('./packages/ztan-crypto/dist/index'); // Use dist if compiled, or ts-node

async function main() {
  const auditId = "TSS-PARITY-TEST";
  const timestamp = 1710000000000;
  const payloadHash = "a2d7ef152e03496365f827cdbb193e355b8e3a8c1288fd274dd54c6d44347a41";
  const threshold = 2;
  const nodeIds = ["SEC-GOV-01", "SRE-AUDIT-02", "TRUST-NODE-03"];

  // 1. Get Canonical Hash
  const { canonicalHashHex } = ThresholdBls.buildCanonicalPayload(
    auditId,
    timestamp,
    payloadHash,
    threshold,
    nodeIds
  );
  console.log(`Canonical Hash: ${canonicalHashHex}`);

  // 2. Generate Deterministic DKG (using fixed seed for reproducibility in vectors)
  // We'll use the package's DKG but we need it to be deterministic for the vector.
  // Actually, I'll just run it once and record the results.
  const { masterPublicKey, shares } = await ThresholdBls.dkg(threshold, nodeIds.length, nodeIds);
  
  // 3. Sign with NodeIds A and B
  const sig1 = await ThresholdBls.signShare(canonicalHashHex, shares[0].secretShare);
  const sig2 = await ThresholdBls.signShare(canonicalHashHex, shares[1].secretShare);
  
  const aggregated = await ThresholdBls.aggregate([sig1, sig2]);

  console.log(`Master Public Key: ${masterPublicKey}`);
  console.log(`Aggregated Signature: ${aggregated}`);
}

main();
