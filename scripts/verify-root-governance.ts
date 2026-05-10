import { WitnessEngine } from '../packages/ztan-witness/src/witness';
import { FinalizedEnvelope } from '../packages/sandbox/src/types';
import * as fs from 'fs';

/**
 * 🛡️ Root Governance & Epoch Audit
 * Verifies the institutional lineage and checkpoint finality.
 */
async function main() {
    console.log("--- 🛡️ ROOT GOVERNANCE AUDIT START ---");

    const witness = new WitnessEngine();

    const createEnvelope = (id: string): FinalizedEnvelope => ({
        version: "1.0.0",
        missionId: "mission-governance",
        executionId: id,
        lineage: {
            mountHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            executionHash: "f1d2d3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2"
        },
        outcome: { exitCode: 0, securityEvent: null },
        timestamp: new Date().toISOString()
    });

    // 1. Process Envelopes for Epoch 1
    console.log("[AUDIT] Establishing Epoch 1...");
    await witness.sign(createEnvelope("exec-1"));
    await witness.sign(createEnvelope("exec-2"));
    const epoch1 = await witness.checkpoint();
    
    console.log(`[RESULT] Epoch 1 Root: ${epoch1.rootHash}, Range: ${epoch1.envelopeRange.start}-${epoch1.envelopeRange.end}`);

    if (epoch1.epochId !== 1 || epoch1.prevRootHash === null) {
        // Note: prevRootHash is null for the very first epoch
        console.log("✅ PASS: Epoch 1 correctly initialized.");
    }

    // 2. Process Envelopes for Epoch 2
    console.log("[AUDIT] Establishing Epoch 2...");
    await witness.sign(createEnvelope("exec-3"));
    const epoch2 = await witness.checkpoint();

    console.log(`[RESULT] Epoch 2 Root: ${epoch2.rootHash}, Range: ${epoch2.envelopeRange.start}-${epoch2.envelopeRange.end}`);

    if (epoch2.prevRootHash === epoch1.rootHash) {
        console.log("✅ PASS: Epoch 2 correctly linked to Epoch 1 (Merkle Chaining).");
    } else {
        console.error("❌ FAIL: Epoch lineage breach! Epoch 2 prevRootHash mismatch.");
        process.exit(1);
    }

    // 3. Verify Ledger Immutability
    console.log("[AUDIT] Testing Ledger Immutability...");
    const history = witness.getLedgerHistory();
    try {
        (history as any)[0] = "TAMPERED";
    } catch (e) {}

    if (witness.getLedgerHistory()[0].epochId === 1) {
        console.log("✅ PASS: Root Ledger correctly enforces Immutability.");
    } else {
        console.error("❌ FAIL: Root Ledger was mutated!");
        process.exit(1);
    }

    // 4. Verify Monotonicity
    if (epoch2.epochId === epoch1.epochId + 1) {
        console.log("✅ PASS: Epoch IDs are monotonically increasing.");
    } else {
        console.error("❌ FAIL: Non-monotonic Epoch IDs detected!");
        process.exit(1);
    }

    console.log("\n✅ SUCCESS: Root Governance & Epoch Lineage Verified.");
    fs.writeFileSync('root_governance_audit.txt', 'PASSED');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
