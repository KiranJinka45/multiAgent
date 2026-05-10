import { ConstitutionManager, CompatibilityClass, InstitutionalConstitution } from '../packages/ztan-witness/src/constitution';
import { InteroperabilityLayer, ForeignProof } from '../packages/ztan-witness/src/interop';
import * as fs from 'fs';

/**
 * 🛡️ Interoperability & Constitutional Compatibility Audit
 * Verifies that the system validates semantic compatibility before accepting foreign truth.
 */
async function main() {
    console.log("--- 🛡️ INTEROPERABILITY SEMANTICS AUDIT START ---");

    // 1. Setup Local Constitution
    const localConstitution: InstitutionalConstitution = {
        institutionId: "INST-ALPHA",
        version: "1.0.0",
        truthModel: "ZTAN-MODEL-V1",
        replayRuntime: "firecracker-v1.0",
        arbitrationRules: "SENIORITY_FIRST",
        invariants: ["EPOCH_MONOTONICITY"]
    };

    const manager = new ConstitutionManager(localConstitution);
    const interop = new InteroperabilityLayer(manager);

    // 2. AUDIT: Fully Compatible Institution
    console.log("[AUDIT] Evaluating FULLY_COMPATIBLE institution...");
    const alphaPrime = { ...localConstitution, institutionId: "INST-ALPHA-PRIME" };
    const comp1 = manager.evaluateCompatibility(alphaPrime);
    if (comp1 === CompatibilityClass.FULLY_COMPATIBLE) {
        console.log("✅ PASS: Identical constitution correctly identified.");
    } else {
        console.error(`❌ FAIL: Expected FULLY_COMPATIBLE, got ${comp1}`);
        process.exit(1);
    }

    // 3. AUDIT: Incompatible Truth Model
    console.log("[AUDIT] Evaluating INCOMPATIBLE institution (Truth Model Mismatch)...");
    const beta = { ...localConstitution, institutionId: "INST-BETA", truthModel: "BETA-MODEL-V2" };
    const proofBeta: ForeignProof = { 
        originInstitutionId: "INST-BETA", 
        constitutionVersion: "1.0.0", 
        data: { root: "DEADBEEF" }, 
        signature: "sig" 
    };
    
    const resultBeta = interop.verifyForeignProof(beta, proofBeta);
    if (resultBeta.status === "INCOMPATIBLE") {
        console.log("✅ PASS: Incompatible truth model correctly rejected before proof processing.");
    } else {
        console.error("❌ FAIL: Incompatible institution was NOT rejected!");
        process.exit(1);
    }

    // 4. AUDIT: Proof Translation (Replay Compatible)
    console.log("[AUDIT] Evaluating REPLAY_COMPATIBLE institution (Version Drift)...");
    const gamma = { ...localConstitution, institutionId: "INST-GAMMA", version: "2.0.0" };
    const proofGamma: ForeignProof = {
        originInstitutionId: "INST-GAMMA",
        constitutionVersion: "2.0.0",
        data: { rootHash: "CAFEBABE" }, // Different key name
        signature: "sig"
    };

    const resultGamma = interop.verifyForeignProof(gamma, proofGamma);
    if (resultGamma.status === "TRANSLATED" && resultGamma.semanticRoot === "0xCAFEBABE") {
        console.log("✅ PASS: Foreign proof correctly translated and normalized.");
    } else {
        console.error("❌ FAIL: Proof translation failed!", resultGamma);
        process.exit(1);
    }

    console.log("\n✅ SUCCESS: Interoperability Semantics Verified.");
    fs.writeFileSync('interop_audit.txt', 'PASSED');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
