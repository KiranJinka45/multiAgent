import { WitnessEngine } from '../packages/ztan-witness/src/witness';
import { IdentityRegistry } from '../packages/ztan-witness/src/identity';
import { FederationProtocolHandler, EpochExchangePacket } from '../packages/ztan-witness/src/protocol';
import { QuorumEngine, QuorumState } from '../packages/ztan-witness/src/quorum';
import * as fs from 'fs';

/**
 * 🛡️ Minimal Quorum Coordination Audit
 * Verifies institutional convergence across multiple witnesses.
 */
async function main() {
    console.log("--- 🛡️ MINIMAL QUORUM AUDIT START ---");

    const registry = new IdentityRegistry();
    
    // 1. Setup Witnesses (Authorized Set of 3)
    const w1 = new WitnessEngine();
    const w2 = new WitnessEngine();
    const w3 = new WitnessEngine();

    const id1 = registry.register(w1.publicKey, ["coder"]);
    const id2 = registry.register(w2.publicKey, ["coder"]);
    const id3 = registry.register(w3.publicKey, ["coder"]);

    // 2. Setup Quorum Engine (Threshold: 2/3)
    const thresholds = { minWitnessCount: 2, percentageRequired: 0.66 };
    const quorumEngine = new QuorumEngine(thresholds, 3);
    
    // 3. Establish Local Epoch 1 (Source of Truth)
    const dummy: any = { 
        version: "1.0.0", missionId: "m1", executionId: "e1", 
        lineage: { mountHash: "h1", executionHash: "h2" },
        outcome: { exitCode: 0, securityEvent: null },
        timestamp: new Date().toISOString()
    };
    await w1.sign(dummy);
    const localEpoch1 = await w1.checkpoint();

    const handler = new FederationProtocolHandler(registry, null, quorumEngine);

    // 4. AUDIT: First Attestation (Witness 1)
    console.log("[AUDIT] Witness 1 attesting to Epoch 1...");
    const packet1: EpochExchangePacket = { protocol: "ZFP/1.0", sender: id1.witnessId, epoch: localEpoch1 };
    handler.process(packet1);

    if (quorumEngine.getEpochState(1) === QuorumState.ATTESTED) {
        console.log("✅ PASS: State progressed to ATTESTED after first witness.");
    } else {
        console.error(`❌ FAIL: State was ${quorumEngine.getEpochState(1)}`);
        process.exit(1);
    }

    // 5. AUDIT: Second Attestation (Witness 2 -> Quorum Reached)
    console.log("[AUDIT] Witness 2 attesting to Epoch 1 (Reaching Quorum)...");
    
    // Witness 2 signs the SAME summary
    const { signature: _s, ...summary } = localEpoch1;
    const sig2 = require('crypto').sign("sha256", Buffer.from(JSON.stringify(summary)), {
        key: (w2 as any).privateKey,
        padding: require('crypto').constants.RSA_PKCS1_PSS_PADDING,
    }).toString('base64');

    const packet2: EpochExchangePacket = { 
        protocol: "ZFP/1.0", 
        sender: id2.witnessId, 
        epoch: { ...localEpoch1, signature: sig2 } as any 
    };
    handler.process(packet2);

    if (quorumEngine.getEpochState(1) === QuorumState.QUORUM_REACHED) {
        console.log("✅ PASS: Quorum reached (2/3 witnesses).");
    } else {
        console.error(`❌ FAIL: State was ${quorumEngine.getEpochState(1)}`);
        process.exit(1);
    }

    // 6. AUDIT: Finalization
    console.log("[AUDIT] Finalizing Epoch 1...");
    quorumEngine.finalize(1);
    if (quorumEngine.getEpochState(1) === QuorumState.FINALIZED) {
        console.log("✅ PASS: Institutional Epoch FINALIZED.");
    } else {
        console.error("❌ FAIL: Epoch not finalized!");
        process.exit(1);
    }

    // 7. AUDIT: Threshold Safety (Epoch 2)
    console.log("[AUDIT] Testing threshold safety for Epoch 2...");
    const epoch2 = { ...localEpoch1, epochId: 2 };
    try {
        quorumEngine.finalize(2);
        console.error("❌ FAIL: Epoch finalized WITHOUT quorum!");
        process.exit(1);
    } catch (e) {
        console.log("✅ PASS: Finalization correctly blocked without quorum.");
    }

    console.log("\n✅ SUCCESS: Minimal Quorum Coordination Verified.");
    fs.writeFileSync('quorum_audit.txt', 'PASSED');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
