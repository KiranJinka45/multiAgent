import crypto from 'crypto';
import { WitnessFederation } from '../packages/utils/src/transparency/witness-federation';
import { GovernanceReceipt, governanceSignablePayload, GovernanceSignature } from '../packages/utils/src/transparency/governance';

async function runSimulation() {
    console.log("--- Constitutional Recovery Simulation ---");

    const keyPairs = [
        crypto.generateKeyPairSync('ed25519'),
        crypto.generateKeyPairSync('ed25519'),
        crypto.generateKeyPairSync('ed25519'),
    ];

    const witnesses = keyPairs.map((kp, i) => ({
        id: `w${i+1}`,
        publicKey: kp.publicKey.export({ type: 'spki', format: 'pem' }) as string
    }));
    const witnessPrivKeys = keyPairs.map(kp => kp.privateKey);

    const fed = new WitnessFederation(witnesses, 2);
    
    // 1. Initial State
    console.log("\nPhase 1: Recording a COUNCIL_RESET...");
    const newCouncil = {
        members: [{ id: 'new-c1', publicKey: crypto.generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'pem' }) as string }],
        threshold: 1
    };

    const resetReceipt: GovernanceReceipt = {
        sequenceNumber: 0,
        action: 'COUNCIL_RESET',
        reason: 'Simulated council failure',
        effectiveTimestamp: new Date().toISOString(),
        newCouncil,
        signatures: [],
        previousGRoot: fed.getGovernanceRoot(),
        gRoot: '',
        epochId: 0
    };

    const payload = governanceSignablePayload(resetReceipt);
    resetReceipt.recoverySignatures = witnesses.map((w, i) => ({
        signerKeyId: w.id,
        signature: crypto.sign(null, Buffer.from(payload, 'utf8'), witnessPrivKeys[i]).toString('base64')
    }));

    const error = fed.applyGovernanceReceipt(resetReceipt);
    if (error) throw new Error(error);

    console.log("Council Reset Recorded. Pending challenge window...");
    console.log("Current Epoch (should still be 0):", fed.getEpochId());

    // 2. Test Institutional Lock
    console.log("\nPhase 2: Testing Institutional Lock (blocking other actions)...");
    const blockedReceipt: GovernanceReceipt = {
        sequenceNumber: 1,
        action: 'WITNESS_ADD',
        reason: 'Attempt during recovery',
        effectiveTimestamp: new Date().toISOString(),
        signatures: [],
        previousGRoot: fed.getGovernanceRoot(),
        gRoot: '',
        epochId: 0
    };
    const lockError = fed.applyGovernanceReceipt(blockedReceipt);
    console.log("Blocked Action Result:", lockError);
    if (!lockError?.includes("Institutional Lock")) throw new Error("Expected institutional lock error");

    // 4. Test Finalization
    console.log("\nPhase 4: Fast-forwarding to test finalization...");
    // @ts-ignore
    fed.pendingRecovery.expiresAt = new Date(Date.now() - 1000).toISOString();
    
    // @ts-ignore
    fed.checkRecoveryFinalization();
    
    console.log("Current Epoch (should be 1):", fed.getEpochId());
    if (fed.getEpochId() !== 1) throw new Error("Epoch did not advance after finalization");
    
    console.log("\nPhase 5: Testing Rate Limiting Guardrail...");
    const tooSoonReceipt: GovernanceReceipt = {
        sequenceNumber: 1,
        action: 'COUNCIL_RESET',
        reason: 'Attempting recovery too soon',
        effectiveTimestamp: new Date().toISOString(),
        newCouncil,
        signatures: [],
        previousGRoot: fed.getGovernanceRoot(),
        gRoot: '',
        epochId: 1
    };
    // @ts-ignore
    tooSoonReceipt.recoverySignatures = resetReceipt.recoverySignatures;
    const rateLimitError = fed.applyGovernanceReceipt(tooSoonReceipt);
    console.log("Rate Limit Error:", rateLimitError);
    if (!rateLimitError?.includes("CONSTITUTIONAL_VIOLATION")) throw new Error("Expected rate limit violation");

    console.log("\n✅ ALL CONSTITUTIONAL SIMULATIONS PASSED!");
}

runSimulation().catch(err => {
    console.error("Simulation Failed:", err);
    process.exit(1);
});
