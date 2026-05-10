import { EquilibriumEngine, EquilibriumMetrics } from '../packages/ztan-witness/src/equilibrium';
import * as fs from 'fs';

/**
 * 🛡️ Governance Equilibrium & Coalition Audit
 * Verifies that governance remains pluralistic and detects hidden coalitions.
 */
async function main() {
    console.log("--- 🛡️ GOVERNANCE EQUILIBRIUM AUDIT START ---");

    const engine = new EquilibriumEngine();

    // 1. AUDIT: Entropy-Based Validation
    console.log("[AUDIT] Evaluating quorum entropy...");
    // Case 1: Low entropy (One dominant, others tiny)
    const lowEntropyPowers = [100, 10, 10, 10]; // Total 130. Dominant = 77%
    const entropy1 = engine.calculateEntropy(lowEntropyPowers);
    console.log(`[INFO] Low Entropy Quorum: ${entropy1.toFixed(2)}`);

    // Case 2: High entropy (Balanced)
    const highEntropyPowers = [100, 100, 100, 100];
    const entropy2 = engine.calculateEntropy(highEntropyPowers);
    console.log(`[INFO] High Entropy Quorum: ${entropy2.toFixed(2)}`);

    if (entropy1 < 0.6 && entropy2 > 0.9) {
        console.log("✅ PASS: Quorum entropy correctly calculated and differentiated.");
    } else {
        console.error("❌ FAIL: Entropy calculation incorrect!", { entropy1, entropy2 });
        process.exit(1);
    }

    // 2. AUDIT: Coalition Detection (Shared Dependencies)
    console.log("[AUDIT] Testing coalition detection via shared dependencies...");
    const depMatrix = new Map<string, string[]>();
    depMatrix.set("INST-A", ["PARENT-CORP", "DC-NORTH"]);
    depMatrix.set("INST-B", ["PARENT-CORP", "DC-SOUTH"]);
    depMatrix.set("INST-C", ["INDEPENDENT", "DC-WEST"]);

    const concentration = engine.detectCoalition(["INST-A", "INST-B", "INST-C"], depMatrix);
    console.log(`[INFO] Coalition Concentration (Shared PARENT-CORP): ${concentration.toFixed(2)}`);

    if (concentration > 0.1) {
        console.log("✅ PASS: Hidden operational coalition correctly detected.");
    } else {
        console.error("❌ FAIL: Coalition detection missed shared dependency!");
        process.exit(1);
    }

    // 3. AUDIT: Equilibrium Rejection
    console.log("[AUDIT] Testing equilibrium rejection (Homogenization risk)...");
    const metrics: EquilibriumMetrics = {
        quorumEntropy: 0.5, // Below 0.6 threshold
        coalitionConcentration: 0.1,
        institutionalDependencyIndex: 0.2
    };

    const isValid = engine.validateEquilibrium(metrics);
    if (isValid === false) {
        console.log("✅ PASS: Low entropy quorum correctly rejected from governance.");
    } else {
        console.error("❌ FAIL: Unbalanced quorum was permitted!");
        process.exit(1);
    }

    // 4. AUDIT: Pluralistic Validation
    console.log("[AUDIT] Testing pluralistic equilibrium validation...");
    const goodMetrics: EquilibriumMetrics = {
        quorumEntropy: 0.95,
        coalitionConcentration: 0.05,
        institutionalDependencyIndex: 0.01
    };

    if (engine.validateEquilibrium(goodMetrics) === true) {
        console.log("✅ PASS: Diverse pluralistic quorum correctly accepted.");
    } else {
        console.error("❌ FAIL: Balanced quorum rejected incorrectly!");
        process.exit(1);
    }

    console.log("\n✅ SUCCESS: Governance Equilibrium & Coalition Semantics Verified.");
    fs.writeFileSync('equilibrium_audit.txt', 'PASSED');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
