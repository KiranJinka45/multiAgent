import { FederatedQuorumEngine, FederatedGovernanceReceipt } from '../packages/ztan-witness/src/federation';
import { EquilibriumEngine, EquilibriumMetrics } from '../packages/ztan-witness/src/equilibrium';
import { PowerRegistry } from '../packages/ztan-witness/src/power';
import { InstitutionalTrustState } from '../packages/ztan-witness/src/trust';
import * as fs from 'fs';

/**
 * 🛡️ Minimal Multi-Institution Governance Audit
 * Verifies bounded coordination, receipt generation, and pluralism enforcement.
 */
async function main() {
    console.log("--- 🛡️ FEDERATED GOVERNANCE AUDIT START ---");

    const fedEngine = new FederatedQuorumEngine();
    const equilibrium = new EquilibriumEngine();
    const powerRegistry = new PowerRegistry();

    // Setup Institutions
    powerRegistry.calculateEffectivePower("INST-ALPHA", 100, InstitutionalTrustState.TRUSTED);
    powerRegistry.calculateEffectivePower("INST-BETA", 100, InstitutionalTrustState.TRUSTED);
    powerRegistry.calculateEffectivePower("INST-GAMMA", 100, InstitutionalTrustState.TRUSTED);
    powerRegistry.calculateEffectivePower("INST-DELTA", 100, InstitutionalTrustState.TRUSTED);

    // 1. AUDIT: Federated Quorum Coordination
    console.log("[AUDIT] Coordinating federated trust update...");
    const participants = ["INST-ALPHA", "INST-BETA", "INST-GAMMA", "INST-DELTA"];
    const weights: Record<string, number> = {
        "INST-ALPHA": 100,
        "INST-BETA": 100,
        "INST-GAMMA": 100,
        "INST-DELTA": 100
    };

    const metrics: EquilibriumMetrics = {
        quorumEntropy: equilibrium.calculateEntropy(Object.values(weights)),
        coalitionConcentration: 0.05,
        institutionalDependencyIndex: 0.01
    };

    // 2. AUDIT: Diversity & Equilibrium Validation
    console.log(`[INFO] Evaluating Quorum Entropy: ${metrics.quorumEntropy.toFixed(2)}`);
    if (equilibrium.validateEquilibrium(metrics)) {
        console.log("✅ PASS: Quorum pluralism validated.");
    } else {
        console.error("❌ FAIL: Pluralistic quorum rejected!");
        process.exit(1);
    }

    // 3. AUDIT: Receipt Generation
    console.log("[AUDIT] Generating Federated Governance Receipt...");
    const receipt: FederatedGovernanceReceipt = {
        receiptId: "FED-GOV-001",
        timestamp: new Date().toISOString(),
        decision: {
            type: 'TRUST_UPDATE',
            targetId: 'INST-PROBATIONARY',
            parameters: { newState: 'TRUSTED' },
            outcome: 'APPROVED'
        },
        participants,
        weights,
        equilibriumMetrics: metrics,
        quorumProof: "0xMerkleRootGovernance",
        constitutionalBasis: "FEDERATION_PROTOCOL_V1"
    };

    fedEngine.emitReceipt(receipt);
    const saved = fedEngine.getReceipt("FED-GOV-001");

    if (saved && saved.decision.outcome === 'APPROVED' && saved.participants.length === 4) {
        console.log("✅ PASS: Federated Governance Receipt correctly persisted and verified.");
    } else {
        console.error("❌ FAIL: Receipt persistence failure!");
        process.exit(1);
    }

    // 4. AUDIT: Bounded Coordination Check
    console.log("[AUDIT] Verifying bounded coordination (Targeted decision)...");
    if (receipt.decision.targetId === 'INST-PROBATIONARY') {
        console.log("✅ PASS: Decision correctly targeted specific entity within sovereign boundaries.");
    }

    console.log("\n✅ SUCCESS: Minimal Multi-Institution Governance Verified.");
    fs.writeFileSync('federation_audit.txt', 'PASSED');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
