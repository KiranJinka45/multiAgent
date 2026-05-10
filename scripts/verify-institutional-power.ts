import { PowerRegistry, GovernancePower } from '../packages/ztan-witness/src/power';
import { InstitutionalTrustState } from '../packages/ztan-witness/src/trust';
import * as fs from 'fs';

/**
 * 🛡️ Institutional Power & Anti-Capture Audit
 * Verifies that governance authority is trust-weighted and diversity-constrained.
 */
async function main() {
    console.log("--- 🛡️ INSTITUTIONAL POWER AUDIT START ---");

    const registry = new PowerRegistry();

    // 1. AUDIT: Trust-Weighted Power Calculation
    console.log("[AUDIT] Calculating trust-weighted power...");
    const p1 = registry.calculateEffectivePower("INST-ALPHA", 100, InstitutionalTrustState.TRUSTED);
    const p2 = registry.calculateEffectivePower("INST-BETA", 100, InstitutionalTrustState.LIMITED_TRUST);
    const p3 = registry.calculateEffectivePower("INST-GAMMA", 100, InstitutionalTrustState.PROBATIONARY);
    const p4 = registry.calculateEffectivePower("INST-BAD", 100, InstitutionalTrustState.REVOKED);

    if (p1.currentInfluence === 100 && p2.currentInfluence === 50 && p3.currentInfluence === 10 && p4.currentInfluence === 0) {
        console.log("✅ PASS: Power correctly weighted by trust state.");
    } else {
        console.error("❌ FAIL: Weight calculation incorrect!", { p1, p2, p3, p4 });
        process.exit(1);
    }

    // 2. AUDIT: Anti-Capture Dominance Rejection
    console.log("[AUDIT] Testing anti-capture dominance rule (33% cap)...");
    // Setup a "Giant" and two "Dwarfs"
    registry.calculateEffectivePower("GIANT", 1000, InstitutionalTrustState.TRUSTED);
    registry.calculateEffectivePower("DWARF-1", 100, InstitutionalTrustState.TRUSTED);
    registry.calculateEffectivePower("DWARF-2", 100, InstitutionalTrustState.TRUSTED);

    // Giant = 1000, Total = 1200. Giant Share = 83.3% > 33%
    const isValid = registry.validateQuorumDiversity(["GIANT", "DWARF-1", "DWARF-2"]);
    if (isValid === false) {
        console.log("✅ PASS: Dominant institution correctly blocked from capture.");
    } else {
        console.error("❌ FAIL: Monopoly institution was permitted to lead quorum!");
        process.exit(1);
    }

    // 3. AUDIT: Constitutional Pluralism (Valid Diverse Quorum)
    console.log("[AUDIT] Testing pluralistic quorum (Diverse set)...");
    registry.calculateEffectivePower("P1", 100, InstitutionalTrustState.TRUSTED);
    registry.calculateEffectivePower("P2", 100, InstitutionalTrustState.TRUSTED);
    registry.calculateEffectivePower("P3", 100, InstitutionalTrustState.TRUSTED);
    registry.calculateEffectivePower("P4", 100, InstitutionalTrustState.TRUSTED);

    // Each = 100, Total = 400. Each Share = 25% < 33%
    const isValidPlural = registry.validateQuorumDiversity(["P1", "P2", "P3", "P4"]);
    if (isValidPlural === true) {
        console.log("✅ PASS: Pluralistic diverse quorum correctly validated.");
    } else {
        console.error("❌ FAIL: Diverse quorum rejected incorrectly!");
        process.exit(1);
    }

    // 4. AUDIT: Zero-Influence Enforcement
    console.log("[AUDIT] Verifying zero influence for Revoked/Suspended...");
    if (p4.currentInfluence === 0) {
        console.log("✅ PASS: REVOKED institutions have zero governance authority.");
    }

    console.log("\n✅ SUCCESS: Institutional Power & Anti-Capture Semantics Verified.");
    fs.writeFileSync('power_audit.txt', 'PASSED');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
