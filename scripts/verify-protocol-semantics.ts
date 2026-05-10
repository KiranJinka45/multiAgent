import { WitnessEngine } from '../packages/ztan-witness/src/witness';
import { IdentityRegistry } from '../packages/ztan-witness/src/identity';
import { FederationProtocolHandler, EpochExchangePacket } from '../packages/ztan-witness/src/protocol';
import * as fs from 'fs';

/**
 * 🛡️ Federation Protocol Semantics Audit
 * Verifies that the constitutional rules of truth exchange are enforced.
 */
async function main() {
    console.log("--- 🛡️ FEDERATION PROTOCOL AUDIT START ---");

    const registry = new IdentityRegistry();
    
    // 1. Setup Local State (Epoch 1)
    const localWitness = new WitnessEngine();
    registry.register(localWitness.publicKey, ["coder"]);
    
    // Dummy envelope to create epoch
    const dummy: any = { 
        version: "1.0.0", missionId: "m1", executionId: "e1", 
        lineage: { mountHash: "h1", executionHash: "h2" },
        outcome: { exitCode: 0, securityEvent: null },
        timestamp: new Date().toISOString()
    };
    await localWitness.sign(dummy);
    const localEpoch1 = await localWitness.checkpoint();
    console.log(`[LOCAL] Established local Epoch 1 (Root: ${localEpoch1.rootHash})`);

    // 2. Setup Remote Witness
    const remoteWitness = new WitnessEngine();
    const remoteIdentity = registry.register(remoteWitness.publicKey, ["coder"]);
    console.log(`[REMOTE] Registered remote witness: ${remoteIdentity.witnessId}`);

    const handler = new FederationProtocolHandler(registry, localEpoch1);

    // 3. AUDIT: Unauthorized Witness
    console.log("[AUDIT] Testing unauthorized witness rejection...");
    const maliciousWitness = new WitnessEngine();
    await maliciousWitness.sign(dummy);
    const maliciousEpoch = await maliciousWitness.checkpoint();
    
    const maliciousPacket: EpochExchangePacket = {
        protocol: "ZFP/1.0",
        sender: "unknown_witness",
        epoch: maliciousEpoch
    };

    if (!handler.validate(maliciousPacket)) {
        console.log("✅ PASS: Unauthorized witness correctly REJECTED.");
    } else {
        console.error("❌ FAIL: Unauthorized witness was ACCEPTED!");
        process.exit(1);
    }

    // 4. AUDIT: Lineage Breach (Invalid prevRootHash)
    console.log("[AUDIT] Testing lineage breach detection...");
    await remoteWitness.sign(dummy);
    const remoteEpoch2 = await remoteWitness.checkpoint();
    
    // Force invalid linkage
    const brokenEpoch2 = { ...remoteEpoch2, prevRootHash: "CORRUPTED_LINK" };
    const brokenPacket: EpochExchangePacket = {
        protocol: "ZFP/1.0",
        sender: remoteIdentity.witnessId,
        epoch: brokenEpoch2 as any
    };

    if (!handler.validate(brokenPacket)) {
        console.log("✅ PASS: Lineage breach (prevRootHash mismatch) correctly REJECTED.");
    } else {
        console.error("❌ FAIL: Lineage breach was ACCEPTED!");
        process.exit(1);
    }

    // 5. AUDIT: Valid Synchronization
    console.log("[AUDIT] Testing valid epoch synchronization...");
    // Create a remote epoch that correctly chains to localEpoch1
    // (In reality, the remote witness would have processed the same history)
    const validRemoteEpoch2 = { ...remoteEpoch2, prevRootHash: localEpoch1.rootHash, epochId: localEpoch1.epochId + 1 };
    
    // We need a valid signature for this summary
    const { signature, ...summary } = validRemoteEpoch2;
    const validSignature = require('crypto').sign("sha256", Buffer.from(JSON.stringify(summary)), {
        key: (remoteWitness as any).privateKey,
        padding: require('crypto').constants.RSA_PKCS1_PSS_PADDING,
    }).toString('base64');

    const validPacket: EpochExchangePacket = {
        protocol: "ZFP/1.0",
        sender: remoteIdentity.witnessId,
        epoch: { ...validRemoteEpoch2, signature: validSignature } as any
    };

    if (handler.validate(validPacket)) {
        console.log("✅ PASS: Validly chained and signed epoch ACCEPTED.");
    } else {
        console.error("❌ FAIL: Valid epoch was REJECTED!");
        process.exit(1);
    }

    console.log("\n✅ SUCCESS: Federation Protocol Semantics Verified.");
    fs.writeFileSync('protocol_audit.txt', 'PASSED');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
