import { WitnessEngine } from '../packages/ztan-witness/src/witness';
import { IdentityRegistry } from '../packages/ztan-witness/src/identity';
import { FederationProtocolHandler, EpochExchangePacket, EpochState } from '../packages/ztan-witness/src/protocol';
import * as fs from 'fs';

/**
 * 🛡️ Federation Fault Semantics Audit
 * Verifies that the state machine correctly handles failures and conflicts.
 */
async function main() {
    console.log("--- 🛡️ FEDERATION FAULT AUDIT START ---");

    const registry = new IdentityRegistry();
    const localWitness = new WitnessEngine();
    registry.register(localWitness.publicKey, ["coder"]);

    const createDummy = (id: string): any => ({ 
        version: "1.0.0", missionId: "m1", executionId: id, 
        lineage: { mountHash: "h1", executionHash: "h2" },
        outcome: { exitCode: 0, securityEvent: null },
        timestamp: new Date().toISOString()
    });

    // 1. Establish Local Epoch 1
    await localWitness.sign(createDummy("e1"));
    const localEpoch1 = await localWitness.checkpoint();

    const remoteWitness = new WitnessEngine();
    const remoteIdentity = registry.register(remoteWitness.publicKey, ["coder"]);
    const handler = new FederationProtocolHandler(registry, localEpoch1);

    // 2. AUDIT: Duplicate Epoch
    console.log("[AUDIT] Testing duplicate epoch rejection...");
    // We need to re-sign the local epoch summary with the remote key to test duplicate ID rejection
    const { signature: _s, ...dupSummary } = localEpoch1;
    const dupSignature = require('crypto').sign("sha256", Buffer.from(JSON.stringify(dupSummary)), {
        key: (remoteWitness as any).privateKey,
        padding: require('crypto').constants.RSA_PKCS1_PSS_PADDING,
    }).toString('base64');

    const duplicatePacket: EpochExchangePacket = {
        protocol: "ZFP/1.0",
        sender: remoteIdentity.witnessId,
        epoch: { ...localEpoch1, signature: dupSignature } as any
    };
    const dupTrail = handler.process(duplicatePacket);
    if (dupTrail.state === EpochState.REJECTED && dupTrail.failureReason === "Duplicate epoch: Already committed or stale") {
        console.log("✅ PASS: Duplicate epoch correctly REJECTED.");
    } else {
        console.error(`❌ FAIL: Duplicate epoch state was ${dupTrail.state}`);
        process.exit(1);
    }

    // 3. AUDIT: Delayed Epoch (Quarantine)
    console.log("[AUDIT] Testing delayed epoch quarantine...");
    await remoteWitness.sign(createDummy("e2"));
    await remoteWitness.sign(createDummy("e3"));
    const remoteEpoch3Raw = await remoteWitness.checkpoint();
    
    // Create a delayed epoch summary (epochId 3)
    const delayedEpochSummary = { 
        ...remoteEpoch3Raw, 
        epochId: 3, 
        prevRootHash: "future_hash",
        timestamp: new Date().toISOString()
    };
    const { signature: _s2, ...delayedSummary } = delayedEpochSummary;
    const delayedSignature = require('crypto').sign("sha256", Buffer.from(JSON.stringify(delayedSummary)), {
        key: (remoteWitness as any).privateKey,
        padding: require('crypto').constants.RSA_PKCS1_PSS_PADDING,
    }).toString('base64');

    const delayedPacket: EpochExchangePacket = {
        protocol: "ZFP/1.0",
        sender: remoteIdentity.witnessId,
        epoch: { ...delayedEpochSummary, signature: delayedSignature } as any
    };
    const delayedTrail = handler.process(delayedPacket);
    if (delayedTrail.state === EpochState.QUARANTINED) {
        console.log("✅ PASS: Delayed epoch correctly QUARANTINED.");
    } else {
        console.error(`❌ FAIL: Delayed epoch state was ${delayedTrail.state}`);
        process.exit(1);
    }

    // 4. AUDIT: Equivocation (Conflict)
    console.log("[AUDIT] Testing equivocation detection...");
    // A packet for epochId 1 (the current local epoch) but with a different root hash
    const conflictingEpoch = { ...localEpoch1, rootHash: "EVIL_ROOT_HASH" };
    
    // Resign the malicious epoch summary
    const { signature, ...summary } = conflictingEpoch;
    const maliciousSignature = require('crypto').sign("sha256", Buffer.from(JSON.stringify(summary)), {
        key: (remoteWitness as any).privateKey,
        padding: require('crypto').constants.RSA_PKCS1_PSS_PADDING,
    }).toString('base64');

    const conflictPacket: EpochExchangePacket = {
        protocol: "ZFP/1.0",
        sender: remoteIdentity.witnessId,
        epoch: { ...conflictingEpoch, signature: maliciousSignature } as any
    };

    const conflictTrail = handler.process(conflictPacket);
    if (conflictTrail.state === EpochState.CONFLICTED) {
        console.log("✅ PASS: Equivocation (conflicting root) correctly identified.");
    } else {
        console.error(`❌ FAIL: Conflict state was ${conflictTrail.state}`);
        process.exit(1);
    }

    // 5. AUDIT: Audit Trail Integrity
    console.log("[AUDIT] Verifying institutional audit trail...");
    const auditHistory = handler.getAuditTrail();
    if (auditHistory.length === 3) {
        console.log("✅ PASS: All failures correctly recorded in institutional audit trail.");
    } else {
        console.error(`❌ FAIL: Audit trail length mismatch. Expected 3, got ${auditHistory.length}`);
        process.exit(1);
    }

    console.log("\n✅ SUCCESS: Federation Fault Semantics Verified.");
    fs.writeFileSync('fault_audit.txt', 'PASSED');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
