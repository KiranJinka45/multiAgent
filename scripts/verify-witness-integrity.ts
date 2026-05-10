import { WitnessEngine } from '../packages/ztan-witness/src/witness';
import { FinalizedEnvelope } from '../packages/sandbox/src/types';
import * as fs from 'fs';

/**
 * 🛡️ Witness Integrity & Tamper-Evidence Audit
 * Verifies that institutional signatures and Merkle anchors are robust.
 */
async function main() {
    console.log("--- 🛡️ WITNESS INTEGRITY AUDIT START ---");

    const witness = new WitnessEngine();

    const envelope: FinalizedEnvelope = {
        version: "1.0.0",
        missionId: "mission-verified-1",
        executionId: "exec-999",
        lineage: {
            mountHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            executionHash: "f1d2d3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2"
        },
        outcome: {
            exitCode: 0,
            securityEvent: null
        },
        timestamp: new Date().toISOString()
    };

    // 1. Generate Witness Receipt
    console.log("[AUDIT] Generating institutional witness receipt...");
    const receipt = await witness.sign(envelope);
    console.log(`[RESULT] Merkle Root: ${receipt.merkleRoot}`);

    // 2. Verify Valid Receipt
    const isValid = witness.verify(receipt);
    if (isValid) {
        console.log("✅ PASS: Witness Receipt verified successfully.");
    } else {
        console.error("❌ FAIL: Valid Witness Receipt failed verification!");
        process.exit(1);
    }

    // 3. Tamper-Evidence Check (Modified Field)
    console.log("[AUDIT] Testing tamper-evidence (modified missionId)...");
    const tamperedReceipt = JSON.parse(JSON.stringify(receipt));
    tamperedReceipt.envelope.missionId = "TAMPERED";
    
    if (!witness.verify(tamperedReceipt)) {
        console.log("✅ PASS: Tampered envelope detected (Signature failed).");
    } else {
        console.error("❌ FAIL: Tampered envelope was ACCEPTED!");
        process.exit(1);
    }

    // 4. Tamper-Evidence Check (Modified Result)
    console.log("[AUDIT] Testing tamper-evidence (modified exitCode)...");
    const tamperedResultReceipt = JSON.parse(JSON.stringify(receipt));
    tamperedResultReceipt.envelope.outcome.exitCode = 1;

    if (!witness.verify(tamperedResultReceipt)) {
        console.log("✅ PASS: Modified outcome detected (Signature failed).");
    } else {
        console.error("❌ FAIL: Modified outcome was ACCEPTED!");
        process.exit(1);
    }

    // 5. Merkle Root Evolution
    console.log("[AUDIT] Testing Merkle root evolution...");
    const envelope2 = { ...envelope, executionId: "exec-1000" };
    const receipt2 = await witness.sign(envelope2);
    
    if (receipt2.merkleRoot !== receipt.merkleRoot) {
        console.log("✅ PASS: Merkle root evolved after second anchoring.");
    } else {
        console.error("❌ FAIL: Merkle root did not change after new leaf!");
        process.exit(1);
    }

    console.log("\n✅ SUCCESS: Witness Integrity & Tamper-Evidence Verified.");
    fs.writeFileSync('witness_integrity_audit.txt', 'PASSED');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
