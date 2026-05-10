import { WitnessEngine } from '../packages/ztan-witness/src/witness';
import { IdentityRegistry } from '../packages/ztan-witness/src/identity';
import { FederationProtocolHandler, EpochExchangePacket } from '../packages/ztan-witness/src/protocol';
import { QuorumEngine, QuorumState } from '../packages/ztan-witness/src/quorum';
import { ArbitrationEngine } from '../packages/ztan-witness/src/arbitration';
import * as fs from 'fs';

/**
 * 🛡️ Convergence Safety & Arbitration Audit
 * Verifies that institutional forks are detected and deterministically resolved.
 */
async function main() {
    console.log("--- 🛡️ CONVERGENCE SAFETY AUDIT START ---");

    const registry = new IdentityRegistry();
    
    // 1. Setup Witnesses (Seniority: w1 > w2 > w3)
    const w1 = new WitnessEngine();
    const id1 = registry.register(w1.publicKey, ["coder"]);
    
    // Sleep to ensure time difference in registration
    await new Promise(r => setTimeout(r, 100));
    const w2 = new WitnessEngine();
    const id2 = registry.register(w2.publicKey, ["coder"]);

    await new Promise(r => setTimeout(r, 100));
    const w3 = new WitnessEngine();
    const id3 = registry.register(w3.publicKey, ["coder"]);

    // 2. Setup Quorum & Arbitration
    const quorumEngine = new QuorumEngine({ minWitnessCount: 2, percentageRequired: 0.6 }, 3);
    const arbiter = new ArbitrationEngine(quorumEngine, registry);
    const handler = new FederationProtocolHandler(registry, null, quorumEngine);

    // 3. Establish Disputed Epoch 1
    // Root A (Witness 1)
    const epochA: any = { 
        epochId: 1, rootHash: "ROOT_A", prevRootHash: "h0", 
        envelopeRange: { start: 0, end: 1 },
        timestamp: new Date().toISOString()
    };
    // Mock signature for valid registration
    const sign = (summary: any, w: WitnessEngine) => {
        const { signature, ...rest } = summary;
        return require('crypto').sign("sha256", Buffer.from(JSON.stringify(rest)), {
            key: (w as any).privateKey,
            padding: require('crypto').constants.RSA_PKCS1_PSS_PADDING,
        }).toString('base64');
    };

    console.log("[AUDIT] Proposing Root A (Witness 1)...");
    const packet1: EpochExchangePacket = { protocol: "ZFP/1.0", sender: id1.witnessId, epoch: { ...epochA, signature: sign(epochA, w1) } };
    handler.process(packet1);

    // Root B (Witness 2) - DIVEREGENCE
    console.log("[AUDIT] Proposing Root B (Witness 2) -> CONFLICT...");
    const epochB: any = { ...epochA, rootHash: "ROOT_B" };
    const packet2: EpochExchangePacket = { protocol: "ZFP/1.0", sender: id2.witnessId, epoch: { ...epochB, signature: sign(epochB, w2) } };
    handler.process(packet2);

    if (quorumEngine.getEpochState(1) === QuorumState.DISPUTED) {
        console.log("✅ PASS: Competing roots correctly triggered DISPUTED state.");
    } else {
        console.error(`❌ FAIL: State was ${quorumEngine.getEpochState(1)}`);
        process.exit(1);
    }

    // 4. AUDIT: Deterministic Arbitration (Equal counts, Seniority wins)
    console.log("[AUDIT] Arbitrating equal attestation counts (Seniority check)...");
    const justification = arbiter. arbitrate(1);
    
    if (justification.winningRoot === "ROOT_A") {
        console.log("✅ PASS: Root A (Witness 1) won due to Institutional Seniority.");
    } else {
        console.error(`❌ FAIL: Wrong winner! Winning root was ${justification.winningRoot}`);
        process.exit(1);
    }

    // 5. AUDIT: Quorum Dominance (Root B gains Witness 3)
    console.log("[AUDIT] Adding Witness 3 to Root B (Testing Quorum Dominance)...");
    // Reset state for new test
    (quorumEngine as any).epochStates.set(1, QuorumState.DISPUTED);
    const packet3: EpochExchangePacket = { protocol: "ZFP/1.0", sender: id3.witnessId, epoch: { ...epochB, signature: sign(epochB, w3) } };
    handler.process(packet3);

    const justification2 = arbiter.arbitrate(1);
    if (justification2.winningRoot === "ROOT_B") {
        console.log("✅ PASS: Root B won due to Quorum Dominance (2 vs 1).");
    } else {
        console.error(`❌ FAIL: Quorum dominance failed! Winner was ${justification2.winningRoot}`);
        process.exit(1);
    }

    console.log("\n✅ SUCCESS: Convergence Safety & Arbitration Verified.");
    fs.writeFileSync('convergence_audit.txt', 'PASSED');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
