import crypto from 'crypto';
import { WitnessFederation } from '../packages/utils/src/transparency/witness-federation';
import { GovernanceReceipt, governanceSignablePayload } from '../packages/utils/src/transparency/governance';

async function runSimulation() {
    console.log("--- Degraded Recovery (Auditor Deadlock) Simulation ---");

    const witnessKeys = Array(5).fill(0).map(() => crypto.generateKeyPairSync('ed25519'));
    const witnesses = witnessKeys.map((kp, i) => ({
        id: `w${i+1}`,
        publicKey: kp.publicKey.export({ type: 'spki', format: 'pem' }) as string,
        url: ''
    }));

    const auditor = {
        id: 'auditor1',
        publicKey: crypto.generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'pem' }) as string,
        status: 'ACTIVE' as const
    };

    const fed = new WitnessFederation(witnesses, 3, [auditor]);
    
    console.log("\nPhase 1: Recording recovery receipt (Auditor is deadlocked)...");
    const pastTime = new Date(Date.now() - 80 * 60 * 60 * 1000).toISOString(); // 80 hours ago (> 72h timeout)
    
    const recovery: GovernanceReceipt = {
        sequenceNumber: 0,
        action: 'COUNCIL_RESET',
        reason: 'Council failure',
        effectiveTimestamp: pastTime,
        newCouncil: { members: [], threshold: 1 },
        signatures: [],
        previousGRoot: fed.getGovernanceRoot(),
        gRoot: '',
        epochId: 0,
        inactivityProof: { lastEvidenceHashes: Array(10).fill('h'), witnessAttestations: [] }
    };

    const payload = governanceSignablePayload(recovery);
    
    // Sign by 4/5 witnesses (Degraded super-majority threshold)
    recovery.recoverySignatures = witnessKeys.slice(0, 4).map((kp, i) => ({
        signerKeyId: `w${i+1}`,
        signature: crypto.sign(null, Buffer.from(payload, 'utf8'), kp.privateKey).toString('base64')
    }));

    // Apply the receipt (starts challenge window/RECOVERING state)
    const error = fed.applyGovernanceReceipt(recovery);
    if (error) throw new Error("Failed to apply recovery: " + error);

    console.log("Recovery recorded. Institutional state should be RECOVERING.");
    
    console.log("\nPhase 2: Finalizing with Degraded Override...");
    // checkRecoveryFinalization is called at the end of applyGovernanceReceipt
    // We need to trigger another action or just call it directly for simulation
    (fed as any).checkRecoveryFinalization();

    const epoch = fed.getEpochId();
    console.log("Current Epoch:", epoch);
    if (epoch !== 1) throw new Error("Degraded recovery failed to finalize!");

    console.log("\n✅ DEGRADED RECOVERY (DEADLOCK RESOLUTION) VALIDATED!");
}

runSimulation().catch(err => {
    console.error("Simulation Failed:", err);
    process.exit(1);
});
