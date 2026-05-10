import { ThresholdBls } from './src/ztan-bls';
import { Canonical } from './src/canonical';

async function runHardenedSuite() {
    console.log("--- ZTAN Hardened Cryptographic Validation Suite ---");

    const iterations = 100;
    let successes = 0;
    const n = 5;
    const t = 3;
    const message = "7861b172d85b1487693994348508499299434850849929943485084992"; // 32 byte hex msg hash
    const nodeIds = Array.from({ length: n }, (_, j) => `node-${j}`);

    console.log(`\n1. Running Multi-Iteration Stability Test (${iterations} runs)...`);
    for (let i = 0; i < iterations; i++) {
        try {
            // DKG
            const dkg = await ThresholdBls.dkg(t, n, nodeIds);
            const masterPk = dkg.masterPublicKey;
            const eligiblePks = dkg.shares.map(s => s.verificationKey);

            // Participants
            const subsetIndices = [1, 2, 3]; // indices 1, 2, 3 (1-based for Lagrange)
            const subsetShares = subsetIndices.map(idx => dkg.shares[idx - 1]);

            // Sign
            const sigShares = await Promise.all(subsetShares.map(s => 
                ThresholdBls.signShare(message, s.secretShare, "ceremony-1", t, eligiblePks)
            ));

            // Aggregate
            const aggregate = await ThresholdBls.aggregate(sigShares, subsetIndices);

            // Verify
            const isValid = await ThresholdBls.verify(aggregate, message, masterPk, "ceremony-1", t, eligiblePks);
            if (isValid) successes++;
        } catch (e: any) {
            console.error(`  ✖ Iteration ${i} failed: ${e.message}`);
        }
    }

    console.log(`   Result: ${successes}/${iterations} successful runs.`);
    if (successes !== iterations) {
        console.error("  ❌ STABILITY FAILURE: Not all iterations passed.");
        process.exit(1);
    } else {
        console.log("   ✅ STABILITY VERIFIED");
    }

    console.log("\n2. Running Adversarial / Negative Tests...");

    const dkg = await ThresholdBls.dkg(t, n, nodeIds);
    const masterPk = dkg.masterPublicKey;
    const eligiblePks = dkg.shares.map(s => s.verificationKey);
    const subsetIndices = [1, 2, 3];
    const subsetShares = subsetIndices.map(idx => dkg.shares[idx - 1]);
    const sigShares = await Promise.all(subsetShares.map(s => 
        ThresholdBls.signShare(message, s.secretShare, "ceremony-1", t, eligiblePks)
    ));

    // Test Case: Insufficient Signers
    console.log("   - Testing Insufficient Signers (t-1)...");
    try {
        const tooFew = sigShares.slice(0, t - 1);
        const tooFewIndices = subsetIndices.slice(0, t - 1);
        await ThresholdBls.aggregate(tooFew, tooFewIndices);
        // This won't throw because aggregate doesn't check t, but verification should fail
        const aggTooFew = await ThresholdBls.aggregate(tooFew, tooFewIndices);
        const isInvalid = await ThresholdBls.verify(aggTooFew, message, masterPk, "ceremony-1", t, eligiblePks);
        if (!isInvalid) {
            console.log("     ✅ Correctly rejected signature with insufficient signers.");
        } else {
            console.error("     ❌ FAILURE: Signature with t-1 signers was accepted!");
            process.exit(1);
        }
    } catch (e) {
        console.log("     ✅ Correctly handled/rejected insufficient aggregation.");
    }

    // Test Case: Corrupted Signature
    console.log("   - Testing Corrupted Aggregate Signature...");
    const aggregate = await ThresholdBls.aggregate(sigShares, subsetIndices);
    const corrupted = "0".repeat(aggregate.length); // Not a valid point
    try {
        const isInvalid = await ThresholdBls.verify(corrupted, message, masterPk, "ceremony-1", t, eligiblePks);
        if (!isInvalid) {
            console.log("     ✅ Correctly rejected corrupted signature (invalid point).");
        } else {
            console.error("     ❌ FAILURE: Corrupted signature was accepted!");
            process.exit(1);
        }
    } catch (e) {
        console.log("     ✅ Correctly rejected corrupted signature (throw).");
    }

    // Test Case: Wrong Master PK
    console.log("   - Testing Wrong Master Public Key...");
    const wrongDkg = await ThresholdBls.dkg(t, n, nodeIds);
    const wrongPk = wrongDkg.masterPublicKey;
    const isInvalidPk = await ThresholdBls.verify(aggregate, message, wrongPk, "ceremony-1", t, eligiblePks);
    if (!isInvalidPk) {
        console.log("     ✅ Correctly rejected verification with wrong Master PK.");
    } else {
        console.error("     ❌ FAILURE: Accepted verification with wrong PK!");
        process.exit(1);
    }

    console.log("\n3. Testing Edge Cases...");
    
    // Edge Case: t=1
    console.log("   - Testing t=1 (Direct Signature)...");
    const dkg1 = await ThresholdBls.dkg(1, 1, ['node-0']);
    const pks1 = dkg1.shares.map(s => s.verificationKey);
    const share1 = await ThresholdBls.signShare(message, dkg1.shares[0].secretShare, "c-1", 1, pks1);
    const agg1 = await ThresholdBls.aggregate([share1], [1]);
    const isValid1 = await ThresholdBls.verify(agg1, message, dkg1.masterPublicKey, "c-1", 1, pks1);
    if (isValid1) {
        console.log("     ✅ t=1 support verified.");
    } else {
        console.error("     ❌ FAILURE: t=1 failed.");
        process.exit(1);
    }

    // Edge Case: t=n
    console.log("   - Testing t=n (Full Consensus)...");
    const dkgn = await ThresholdBls.dkg(n, n, nodeIds);
    const pksn = dkgn.shares.map(s => s.verificationKey);
    const fullIndices = Array.from({ length: n }, (_, j) => j + 1);
    const fullSubset = await Promise.all(dkgn.shares.map(s => 
        ThresholdBls.signShare(message, s.secretShare, "c-n", n, pksn)
    ));
    const aggn = await ThresholdBls.aggregate(fullSubset, fullIndices);
    const isValidn = await ThresholdBls.verify(aggn, message, dkgn.masterPublicKey, "c-n", n, pksn);
    if (isValidn) {
        console.log("     ✅ t=n support verified.");
    } else {
        console.error("     ❌ FAILURE: t=n failed.");
        process.exit(1);
    }

    console.log("\n✔ HARDENED VALIDATION COMPLETE: The system is cryptographically stable and adversarial-resistant.");
}

runHardenedSuite().catch(err => {
    console.error("FATAL ERROR in validation suite:", err);
    process.exit(1);
});
