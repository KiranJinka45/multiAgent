import crypto from 'crypto';
import { WitnessFederation } from '../packages/utils/src/transparency/witness-federation';
import { GovernanceReceipt, governanceSignablePayload, InstitutionalRole } from '../packages/utils/src/transparency/governance';

async function runSimulation() {
    console.log("--- Auditor Federation & Quorum Simulation ---");

    const witnessKey = crypto.generateKeyPairSync('ed25519');
    const auditorKeys = [
        crypto.generateKeyPairSync('ed25519'),
        crypto.generateKeyPairSync('ed25519'),
        crypto.generateKeyPairSync('ed25519'),
    ];

    const witnesses = [{
        id: 'w1',
        publicKey: witnessKey.publicKey.export({ type: 'spki', format: 'pem' }) as string,
        url: 'http://locahost'
    }];
    const auditors = auditorKeys.map((kp, i) => ({
        id: `auditor${i+1}`,
        publicKey: kp.publicKey.export({ type: 'spki', format: 'pem' }) as string
    }));

    const fed = new WitnessFederation(witnesses, 1, auditors);
    
    console.log("\nPhase 1: Attempting recovery WITH ONLY ONE auditor signature (1/2 threshold)...");
    const recovery: GovernanceReceipt = {
        sequenceNumber: 0,
        action: 'COUNCIL_RESET',
        reason: 'Legitimate failure',
        effectiveTimestamp: new Date().toISOString(),
        newCouncil: { members: [], threshold: 1 },
        signatures: [],
        previousGRoot: fed.getGovernanceRoot(),
        gRoot: '',
        epochId: 0,
        inactivityProof: { lastEvidenceHashes: Array(10).fill('h'), witnessAttestations: [] }
    };

    const payload = governanceSignablePayload(recovery);
    
    // Sign by 1 witness
    recovery.recoverySignatures = [{
        signerKeyId: 'w1',
        signature: crypto.sign(null, Buffer.from(payload, 'utf8'), witnessKey.privateKey).toString('base64')
    }];

    // Sign by 1 auditor (Threshold is 2/3 of 3 = 2)
    recovery.auditorSignatures = [{
        signerKeyId: 'auditor1',
        signature: crypto.sign(null, Buffer.from(payload, 'utf8'), auditorKeys[0].privateKey).toString('base64')
    }];

    const error = fed.applyGovernanceReceipt(recovery);
    console.log("Result (Expected Error):", error);
    if (!error?.includes("Insufficient auditor signatures")) throw new Error("Expected auditor quorum error");

    console.log("\nPhase 2: Adding second auditor signature (2/2 threshold)...");
    recovery.auditorSignatures.push({
        signerKeyId: 'auditor2',
        signature: crypto.sign(null, Buffer.from(payload, 'utf8'), auditorKeys[1].privateKey).toString('base64')
    });

    const success = fed.applyGovernanceReceipt(recovery);
    console.log("Result (Expected Success):", success === null ? "SUCCESS" : "FAILED: " + success);
    if (success !== null) throw new Error("Expected success");

    console.log("\n✅ AUDITOR FEDERATION QUORUM VALIDATED!");
}

runSimulation().catch(err => {
    console.error("Simulation Failed:", err);
    process.exit(1);
});
