import * as bls from '@noble/bls12-381';
import { VSS } from '../src/vss';

async function runTest() {
    console.log("--- ZTAN VSS VERIFICATION ---");
    const threshold = 3;
    const secret = bls.utils.randomPrivateKey();
    const coeffs = [BigInt('0x' + Buffer.from(secret).toString('hex'))];
    for (let i = 1; i < threshold; i++) {
        coeffs.push(BigInt('0x' + Buffer.from(bls.utils.randomPrivateKey()).toString('hex')));
    }

    const commitments = VSS.createCommitments(coeffs);
    console.log(`Commitments Generated: ${commitments.length}`);

    let successCount = 0;
    for (let i = 1; i <= 5; i++) {
        const share = VSS.evaluatePolynomial(coeffs, i);
        const isValid = VSS.verifyShare(share.toString(16), i, commitments);
        if (isValid) successCount++;
    }

    if (successCount === 5) {
        console.log("✅ VSS PASS: All 5 shares verified against commitments.");
    } else {
        console.log(`❌ VSS FAIL: Only ${successCount}/5 shares verified.`);
        process.exit(1);
    }
}

runTest().catch(console.error);
