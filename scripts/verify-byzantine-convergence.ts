import { WitnessEngine } from '../packages/ztan-witness/src/witness';
import { IdentityRegistry } from '../packages/ztan-witness/src/identity';
import { FederationProtocolHandler, EpochExchangePacket } from '../packages/ztan-witness/src/protocol';
import { QuorumEngine, QuorumState } from '../packages/ztan-witness/src/quorum';
import { ArbitrationEngine } from '../packages/ztan-witness/src/arbitration';
import { EvidenceEngine, EvidenceType } from '../packages/ztan-witness/src/evidence';
import { ReconciliationEngine } from '../packages/ztan-witness/src/reconciliation';
import { RootLedger } from '../packages/ztan-witness/src/ledger';
import * as fs from 'fs';

/**
 * 🛡️ Byzantine Convergence & Reconciliation Audit
 * Verifies that the system generates evidence for Byzantine behavior and reconciles partitions.
 */
async function main() {
    console.log("--- 🛡️ BYZANTINE CONVERGENCE AUDIT START ---");

    const registry = new IdentityRegistry();
    const w1 = new WitnessEngine();
    const id1 = registry.register(w1.publicKey, ["coder"]);
    
    await new Promise(r => setTimeout(r, 100));
    const w2 = new WitnessEngine();
    const id2 = registry.register(w2.publicKey, ["coder"]);

    // 1. Setup Byzantine Infrastructure
    const quorumEngine = new QuorumEngine({ minWitnessCount: 2, percentageRequired: 0.6 }, 3);
    const evidenceEngine = new EvidenceEngine();
    const arbiter = new ArbitrationEngine(quorumEngine, registry, evidenceEngine);
    const ledger = new RootLedger();
    const reconciler = new ReconciliationEngine(quorumEngine, arbiter, ledger);
    const handler = new FederationProtocolHandler(registry, null, quorumEngine);

    const sign = (summary: any, w: WitnessEngine) => {
        const { signature, ...rest } = summary;
        return require('crypto').sign("sha256", Buffer.from(JSON.stringify(rest)), {
            key: (w as any).privateKey,
            padding: require('crypto').constants.RSA_PKCS1_PSS_PADDING,
        }).toString('base64');
    };

    // 2. AUDIT: Byzantine Evidence Generation
    console.log("[AUDIT] Proposing competing roots for Epoch 1...");
    const epochA: any = { epochId: 1, rootHash: "ROOT_A", prevRootHash: "h0", envelopeRange: { start: 0, end: 1 }, timestamp: new Date().toISOString() };
    handler.process({ protocol: "ZFP/1.0", sender: id1.witnessId, epoch: { ...epochA, signature: sign(epochA, w1) } });

    const epochB: any = { ...epochA, rootHash: "ROOT_B" };
    handler.process({ protocol: "ZFP/1.0", sender: id2.witnessId, epoch: { ...epochB, signature: sign(epochB, w2) } });

    console.log("[AUDIT] Reconciling conflict and checking evidence...");
    reconciler.reconcileConflict(1);

    const evidence = evidenceEngine.getEvidenceForWitness(id2.witnessId);
    if (evidence.length > 0 && evidence[0].type === EvidenceType.EQUIVOCATION) {
        console.log("✅ PASS: Equivocation evidence generated for losing witness.");
    } else {
        console.error("❌ FAIL: No evidence recorded for Byzantine behavior!");
        process.exit(1);
    }

    if (quorumEngine.getEpochState(1) === QuorumState.RECONCILED) {
        console.log("✅ PASS: Epoch 1 successfully RECONCILED.");
    } else {
        console.error(`❌ FAIL: State was ${quorumEngine.getEpochState(1)}`);
        process.exit(1);
    }

    // 3. AUDIT: Partition Healing
    console.log("[AUDIT] Testing partition healing for Epoch 2...");
    const epoch2: any = { epochId: 2, rootHash: "R2", prevRootHash: "ROOT_A", envelopeRange: { start: 1, end: 2 }, timestamp: new Date().toISOString() };
    
    // Simulate commit of epoch 1 to ledger
    ledger.commit(epochA);

    console.log("[AUDIT] Healing quarantined epoch 2...");
    reconciler.healPartitions([epoch2]);

    if (quorumEngine.getEpochState(2) === QuorumState.ACCEPTED) {
        console.log("✅ PASS: Quarantined epoch 2 correctly ACCEPTED after lineage healing.");
    } else {
        console.error(`❌ FAIL: State was ${quorumEngine.getEpochState(2)}`);
        process.exit(1);
    }

    console.log("\n✅ SUCCESS: Byzantine Convergence & Reconciliation Verified.");
    fs.writeFileSync('byzantine_audit.txt', 'PASSED');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
