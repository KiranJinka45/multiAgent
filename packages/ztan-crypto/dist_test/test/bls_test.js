"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ztan_bls_1 = require("../src/ztan-bls");
async function testBls() {
    console.log('--- ZTAN BLS THRESHOLD TEST ---');
    // 1. DKG (3, 5) - Threshold 3, Nodes 5
    console.log('[1] Running DKG (3, 5)...');
    const { masterPublicKey, shares } = await ztan_bls_1.ThresholdBls.dkg(3, 5);
    console.log(`  ✔ Master Public Key: ${masterPublicKey.slice(0, 16)}...`);
    console.log(`  ✔ Generated ${shares.length} shares.`);
    const payload = "ZTAN-AUDIT-DATA-V1.4";
    console.log(`\n[2] Signing payload: "${payload}"`);
    // 2. Select 3 nodes to sign
    const signers = shares.slice(0, 3);
    const partialSignatures = await Promise.all(signers.map(s => ztan_bls_1.ThresholdBls.signShare(payload, s.secretShare)));
    console.log(`  ✔ Collected ${partialSignatures.length} partial signatures.`);
    // 3. Aggregate
    console.log('\n[3] Aggregating signatures...');
    const aggregatedSignature = await ztan_bls_1.ThresholdBls.aggregate(partialSignatures);
    console.log(`  ✔ Aggregated: ${aggregatedSignature.slice(0, 16)}...`);
    // 4. Verify
    console.log('\n[4] Verifying aggregated signature...');
    const isValid = await ztan_bls_1.ThresholdBls.verify(aggregatedSignature, payload, signers.map(s => s.verificationKey));
    if (isValid) {
        console.log('  ✔ SUCCESS: Aggregated signature is VALID.');
    }
    else {
        console.error('  ✖ FAILED: Aggregated signature is INVALID.');
        process.exit(1);
    }
    // 5. Verify with WRONG nodes (Threshold met but wrong keys)
    console.log('\n[5] Verifying with incorrect signer set (should fail)...');
    const wrongPublicKeys = shares.slice(1, 4).map(s => s.verificationKey);
    const isValidWrong = await ztan_bls_1.ThresholdBls.verify(aggregatedSignature, payload, wrongPublicKeys);
    if (!isValidWrong) {
        console.log('  ✔ CORRECT: Rejection confirmed for mismatched keys.');
    }
    else {
        console.error('  ✖ SECURITY FAILED: Signature accepted with wrong keys!');
        process.exit(1);
    }
    console.log('\n--- BLS TEST PASSED CLEANLY ---');
}
testBls().catch(console.error);
