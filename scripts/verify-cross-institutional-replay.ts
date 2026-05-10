import { InstitutionalConstitution, CompatibilityClass } from '../packages/ztan-witness/src/constitution';
import { InteroperabilityLayer, ForeignProof, VerificationConfidence } from '../packages/ztan-witness/src/interop';
import { SovereignVerificationEngine } from '../packages/ztan-witness/src/verification';
import { CrossInstitutionVerificationEngine } from '../packages/ztan-witness/src/cross-verification';
import { ReceiptVault } from '../packages/ztan-witness/src/receipt';
import { WitnessEngine } from '../packages/ztan-witness/src/witness';
import { ConstitutionManager } from '../packages/ztan-witness/src/constitution';
import * as fs from 'fs';

/**
 * 🛡️ Cross-Institutional Replay Verification Audit
 * Verifies that the system generates sovereign receipts and maintains institutional boundaries.
 */
async function main() {
    console.log("--- 🛡️ CROSS-INSTITUTIONAL REPLAY AUDIT START ---");

    // 1. Setup Local Institutional Context
    const localConstitution: InstitutionalConstitution = {
        institutionId: "LOCAL-INST",
        version: "1.0.0",
        truthModel: "ZTAN-MODEL-V1",
        replayRuntime: "firecracker-v1.0",
        arbitrationRules: "SENIORITY_FIRST",
        invariants: ["EPOCH_MONOTONICITY"]
    };

    const witness = new WitnessEngine();
    const vault = new ReceiptVault();
    const manager = new ConstitutionManager(localConstitution);
    const interop = new InteroperabilityLayer(manager);
    const verificationEngine = new SovereignVerificationEngine(interop);
    
    const crossEngine = new CrossInstitutionVerificationEngine(
        verificationEngine,
        witness,
        vault,
        localConstitution
    );

    // 2. Setup Foreign Institutional Context (Gamma - Version Drift)
    const foreignGamma: InstitutionalConstitution = {
        ...localConstitution,
        institutionId: "FOREIGN-GAMMA",
        version: "2.0.0" // Version drift triggers confidence degradation
    };

    const proofGamma: ForeignProof = {
        originInstitutionId: "FOREIGN-GAMMA",
        constitutionVersion: "2.0.0",
        data: { rootHash: "GAMMA_ROOT_01" },
        signature: "sig_gamma"
    };

    // 3. AUDIT: Sovereign Verification Receipt Generation
    console.log("[AUDIT] Executing cross-institution verification for Foreign Gamma...");
    const receipt = crossEngine.verifyForeignEpoch(foreignGamma, proofGamma, 101);

    if (receipt.receiptId.startsWith("VR-LOCAL-INST")) {
        console.log("✅ PASS: Sovereign Verification Receipt generated with local institutional identity.");
    } else {
        console.error("❌ FAIL: Receipt ID mismatch!");
        process.exit(1);
    }

    if (receipt.verificationConfidence === VerificationConfidence.SEMANTICALLY_TRANSLATED) {
        console.log("✅ PASS: Receipt correctly captures degraded verification confidence.");
    } else {
        console.error(`❌ FAIL: Expected SEMANTICALLY_TRANSLATED, got ${receipt.verificationConfidence}`);
        process.exit(1);
    }

    // 4. AUDIT: Traceability & Lineage
    if (receipt.lineage.foreignEpochId === 101 && receipt.lineage.foreignRootHash === "GAMMA_ROOT_01") {
        console.log("✅ PASS: Audit trail maintains full lineage to foreign source.");
    } else {
        console.error("❌ FAIL: Lineage corrupted!");
        process.exit(1);
    }

    // 5. AUDIT: Integrity Metadata Preservation
    const infoLost = receipt.translatedProof.integrityMetadata.informationLost;
    if (receipt.sourceConstitution.version !== receipt.targetConstitution.version) {
        console.log(`[INFO] Cross-Constitution verification detected: ${receipt.sourceConstitution.institutionId} -> ${receipt.targetConstitution.institutionId}`);
        console.log(`[INFO] Information lost during translation: ${infoLost.length > 0 ? infoLost.join(", ") : "None"}`);
    }

    // 6. AUDIT: Vault Persistence
    if (vault.list().length === 1) {
        console.log("✅ PASS: Sovereign receipt successfully persisted in audit vault.");
    } else {
        console.error("❌ FAIL: Vault persistence failed!");
        process.exit(1);
    }

    console.log("\n✅ SUCCESS: Cross-Institutional Replay Verification Verified.");
    fs.writeFileSync('cross_replay_audit.txt', 'PASSED');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
