import { WitnessEngine } from '../packages/ztan-witness/src/witness';
import { IdentityRegistry } from '../packages/ztan-witness/src/identity';
import { FederationProtocolHandler, EpochExchangePacket } from '../packages/ztan-witness/src/protocol';
import { QuorumEngine, QuorumState } from '../packages/ztan-witness/src/quorum';
import { LivenessMonitor, LivenessPolicy } from '../packages/ztan-witness/src/liveness';
import * as fs from 'fs';

/**
 * 🛡️ Institutional Liveness & Stagnation Audit
 * Verifies that the system detects forward progress failure and halts correctly.
 */
async function main() {
    console.log("--- 🛡️ INSTITUTIONAL LIVENESS AUDIT START ---");

    const registry = new IdentityRegistry();
    const w1 = new WitnessEngine();
    const id1 = registry.register(w1.publicKey, ["coder"]);

    // 1. Setup Liveness Policy (Tight timeouts for testing)
    const policy: LivenessPolicy = {
        quorumTimeoutMs: 500,
        arbitrationDeadlineMs: 1000,
        maxConsecutiveExpirations: 2
    };

    const quorumEngine = new QuorumEngine({ minWitnessCount: 2, percentageRequired: 0.6 }, 3);
    const livenessMonitor = new LivenessMonitor(quorumEngine, policy);
    const handler = new FederationProtocolHandler(registry, null, quorumEngine, livenessMonitor);

    const sign = (summary: any, w: WitnessEngine) => {
        const { signature, ...rest } = summary;
        return require('crypto').sign("sha256", Buffer.from(JSON.stringify(rest)), {
            key: (w as any).privateKey,
            padding: require('crypto').constants.RSA_PKCS1_PSS_PADDING,
        }).toString('base64');
    };

    // 2. AUDIT: Quorum Timeout
    console.log("[AUDIT] Proposing Epoch 1 (Insufficient witnesses)...");
    const epoch1: any = { epochId: 1, rootHash: "R1", prevRootHash: "h0", envelopeRange: { start: 0, end: 1 }, timestamp: new Date().toISOString() };
    handler.process({ protocol: "ZFP/1.0", sender: id1.witnessId, epoch: { ...epoch1, signature: sign(epoch1, w1) } });

    console.log("[AUDIT] Waiting for quorum timeout...");
    await new Promise(r => setTimeout(r, 600));
    livenessMonitor.checkLiveness();

    if (quorumEngine.getEpochState(1) === QuorumState.EXPIRED) {
        console.log("✅ PASS: Epoch 1 EXPIRED due to quorum timeout.");
    } else {
        console.error(`❌ FAIL: State was ${quorumEngine.getEpochState(1)}`);
        process.exit(1);
    }

    // 3. AUDIT: Institutional Halt (Consecutive Expirations)
    console.log("[AUDIT] Proposing Epoch 2 (Second failure -> HALT)...");
    const epoch2: any = { ...epoch1, epochId: 2 };
    handler.process({ protocol: "ZFP/1.0", sender: id1.witnessId, epoch: { ...epoch2, signature: sign(epoch2, w1) } });

    console.log("[AUDIT] Waiting for second timeout...");
    await new Promise(r => setTimeout(r, 600));
    livenessMonitor.checkLiveness();

    if (quorumEngine.getEpochState(2) === QuorumState.HALTED) {
        console.log("✅ PASS: System entered INSTITUTIONAL HALT after 2 expirations.");
    } else {
        console.error(`❌ FAIL: State was ${quorumEngine.getEpochState(2)}`);
        process.exit(1);
    }

    // 4. AUDIT: Arbitration Deadline
    console.log("[AUDIT] Testing arbitration deadline on Epoch 3...");
    const quorumEngine2 = new QuorumEngine({ minWitnessCount: 2, percentageRequired: 0.6 }, 3);
    const livenessMonitor2 = new LivenessMonitor(quorumEngine2, policy);
    const handler2 = new FederationProtocolHandler(registry, null, quorumEngine2, livenessMonitor2);

    // Force DISPUTED state
    const epoch3: any = { ...epoch1, epochId: 3 };
    handler2.process({ protocol: "ZFP/1.0", sender: id1.witnessId, epoch: { ...epoch3, signature: sign(epoch3, w1) } });
    
    // Witness 2 proposes DIFFERENT root
    const w2 = new WitnessEngine();
    const id2 = registry.register(w2.publicKey, ["coder"]);
    const epoch3B: any = { ...epoch3, rootHash: "R3B" };
    handler2.process({ protocol: "ZFP/1.0", sender: id2.witnessId, epoch: { ...epoch3B, signature: sign(epoch3B, w2) } });

    console.log("[AUDIT] Waiting for arbitration deadline...");
    await new Promise(r => setTimeout(r, 1100));
    livenessMonitor2.checkLiveness();

    if (quorumEngine2.getEpochState(3) === QuorumState.EXPIRED) {
        console.log("✅ PASS: Disputed Epoch 3 EXPIRED due to arbitration deadline.");
    } else {
        console.error(`❌ FAIL: State was ${quorumEngine2.getEpochState(3)}`);
        process.exit(1);
    }

    console.log("\n✅ SUCCESS: Convergence Liveness & Stagnation Verified.");
    fs.writeFileSync('liveness_audit.txt', 'PASSED');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
