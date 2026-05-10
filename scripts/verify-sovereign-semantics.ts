import { ConstitutionManager, InstitutionalConstitution, CompatibilityClass } from '../packages/ztan-witness/src/constitution';
import { InteroperabilityLayer, ForeignProof, VerificationConfidence } from '../packages/ztan-witness/src/interop';
import { SovereignVerificationEngine } from '../packages/ztan-witness/src/verification';
import * as fs from 'fs';

/**
 * 🛡️ Sovereign Verification & Confidence Audit
 * Verifies that the system explicitly tracks verification confidence and preserves sovereignty.
 */
async function main() {
    console.log("--- 🛡️ SOVEREIGN VERIFICATION AUDIT START ---");

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
    const engine = new SovereignVerificationEngine(interop);

    // 1. AUDIT: Full Verification (Identical Constitution)
    console.log("[AUDIT] Verifying FULL_VERIFIED (Alpha Prime)...");
    const alphaPrime = { ...localConstitution, institutionId: "INST-ALPHA-PRIME" };
    const proof1: ForeignProof = { originInstitutionId: "INST-ALPHA-PRIME", constitutionVersion: "1.0.0", data: { root: "ROOT1" }, signature: "sig" };
    
    const result1 = engine.verify(alphaPrime, proof1);
    if (result1.confidence === VerificationConfidence.FULL_VERIFIED) {
        console.log("✅ PASS: Native finality achieved for identical constitution.");
    } else {
        console.error(`❌ FAIL: Wrong confidence! ${result1.confidence}`);
        process.exit(1);
    }

    // 2. AUDIT: Semantic Translation (Replay Compatible)
    console.log("[AUDIT] Verifying SEMANTICALLY_TRANSLATED (Version Drift)...");
    const gamma = { ...localConstitution, institutionId: "INST-GAMMA", version: "2.0.0" };
    const proof2: ForeignProof = { originInstitutionId: "INST-GAMMA", constitutionVersion: "2.0.0", data: { rootHash: "ROOT2" }, signature: "sig" };
    
    const result2 = engine.verify(gamma, proof2);
    if (result2.confidence === VerificationConfidence.SEMANTICALLY_TRANSLATED) {
        console.log("✅ PASS: Confidence correctly degraded to SEMANTICALLY_TRANSLATED.");
        console.log(`[INFO] Mappings applied: ${result2.integrityMetadata.mappingsApplied.join(", ")}`);
    } else {
        console.error(`❌ FAIL: Wrong confidence! ${result2.confidence}`);
        process.exit(1);
    }

    // 3. AUDIT: Partial Verification (Runtime Mismatch)
    console.log("[AUDIT] Verifying PARTIALLY_VERIFIED (Runtime Mismatch)...");
    const delta = { ...localConstitution, institutionId: "INST-DELTA", replayRuntime: "gvisor-v1.0" };
    const proof3: ForeignProof = { originInstitutionId: "INST-DELTA", constitutionVersion: "1.0.0", data: { root: "ROOT3" }, signature: "sig" };
    
    const result3 = engine.verify(delta, proof3);
    if (result3.confidence === VerificationConfidence.PARTIALLY_VERIFIED) {
        console.log("✅ PASS: Confidence correctly degraded to PARTIALLY_VERIFIED.");
        console.log(`[INFO] Information lost: ${result3.integrityMetadata.informationLost.join(", ")}`);
        console.log(`[INFO] Assurance degradation: ${result3.integrityMetadata.assuranceDegradation}`);
    } else {
        console.error(`❌ FAIL: Wrong confidence! ${result3.confidence}`);
        process.exit(1);
    }

    console.log("\n✅ SUCCESS: Sovereign Verification Semantics Verified.");
    fs.writeFileSync('sovereign_audit.txt', 'PASSED');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
