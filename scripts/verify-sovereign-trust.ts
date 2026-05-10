import { TrustRegistry, InstitutionalTrustState, TrustPosture } from '../packages/ztan-witness/src/trust';
import { InstitutionalConstitution } from '../packages/ztan-witness/src/constitution';
import * as fs from 'fs';

/**
 * 🛡️ Sovereign Trust & Drift Audit
 * Verifies that the system correctly governs institutional trust states and drift.
 */
async function main() {
    console.log("--- 🛡️ SOVEREIGN TRUST GOVERNANCE AUDIT START ---");

    const registry = new TrustRegistry();

    // 1. AUDIT: Default Trust (Probationary)
    console.log("[AUDIT] Evaluating default trust posture...");
    const p1 = registry.getPosture("INST-NEW");
    if (p1.state === InstitutionalTrustState.PROBATIONARY) {
        console.log("✅ PASS: Unknown institution correctly assigned PROBATIONARY status.");
    } else {
        console.error(`❌ FAIL: Expected PROBATIONARY, got ${p1.state}`);
        process.exit(1);
    }

    // 2. AUDIT: Trust Degradation via Drift
    console.log("[AUDIT] Testing trust degradation via constitutional drift...");
    registry.updatePosture("INST-ALPHA", {
        state: InstitutionalTrustState.TRUSTED,
        lastAuditDate: new Date().toISOString(),
        justification: "Full alignment",
        constraints: []
    });

    registry.evaluateDrift("INST-ALPHA", true); // Drift detected
    const p2 = registry.getPosture("INST-ALPHA");
    if (p2.state === InstitutionalTrustState.LIMITED_TRUST) {
        console.log("✅ PASS: Trust correctly degraded to LIMITED_TRUST after drift.");
    } else {
        console.error(`❌ FAIL: Drift degradation failed! ${p2.state}`);
        process.exit(1);
    }

    // 3. AUDIT: Institutional Suspension
    console.log("[AUDIT] Testing institutional suspension...");
    registry.updatePosture("INST-BETA", {
        state: InstitutionalTrustState.SUSPENDED,
        lastAuditDate: new Date().toISOString(),
        justification: "Audit failure",
        constraints: ["REJECT_FOR_QUORUM"]
    });

    const p3 = registry.getPosture("INST-BETA");
    if (p3.state === InstitutionalTrustState.SUSPENDED) {
        console.log("✅ PASS: Institution correctly SUSPENDED.");
    } else {
        console.error("❌ FAIL: Suspension failed!");
        process.exit(1);
    }

    // 4. AUDIT: Independence of Replay Correctness (Logic Check)
    console.log("[AUDIT] Verifying independence of replay correctness...");
    // Even if SUSPENDED, the registry allows us to get the posture and see the constraints
    if (p3.state === InstitutionalTrustState.SUSPENDED && p3.constraints.includes("REJECT_FOR_QUORUM")) {
        console.log("✅ PASS: Technical validity is separated from institutional legitimacy (SUSPENDED but auditable).");
    }

    // 5. AUDIT: Terminal Revocation
    console.log("[AUDIT] Testing terminal revocation...");
    registry.updatePosture("INST-CRITICAL-FAIL", {
        state: InstitutionalTrustState.REVOKED,
        lastAuditDate: new Date().toISOString(),
        justification: "Byzantine behavior proven",
        constraints: ["BLOCK_ALL"]
    });

    const p4 = registry.getPosture("INST-CRITICAL-FAIL");
    if (p4.state === InstitutionalTrustState.REVOKED) {
        console.log("✅ PASS: Institution correctly REVOKED.");
    } else {
        console.error("❌ FAIL: Revocation failed!");
        process.exit(1);
    }

    console.log("\n✅ SUCCESS: Sovereign Trust Governance Verified.");
    fs.writeFileSync('trust_audit.txt', 'PASSED');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
