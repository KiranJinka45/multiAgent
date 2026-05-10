import crypto from 'crypto';
import { WitnessFederation } from '../packages/utils/src/transparency/witness-federation';
import { GovernanceReceipt, governanceSignablePayload, InstitutionalRole } from '../packages/utils/src/transparency/governance';
import { SovereigntyHierarchy, DEFAULT_CONSTITUTION } from '../packages/utils/src/transparency/constitutional';

async function runSimulation() {
    console.log("--- Adversarial Recovery Simulation ---");

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
    
    console.log("\nPhase 1: Attempting recovery WITHOUT inactivity proof...");
    const badReset: GovernanceReceipt = {
        sequenceNumber: 0,
        action: 'COUNCIL_RESET',
        reason: 'Malicious witness coup',
        effectiveTimestamp: new Date().toISOString(),
        newCouncil: { members: [], threshold: 1 },
        signatures: [],
        previousGRoot: fed.getGovernanceRoot(),
        gRoot: '',
        epochId: 0
    };

    const payload = governanceSignablePayload(badReset);
    badReset.recoverySignatures = witnesses.map((w, i) => ({
        signerKeyId: w.id,
        signature: crypto.sign(null, Buffer.from(payload, 'utf8'), witnessPrivKeys[i]).toString('base64')
    }));

    const error = fed.applyGovernanceReceipt(badReset);
    console.log("Result (Expected Error):", error);
    if (!error?.includes("requires inactivityProof")) throw new Error("Expected inactivityProof error");

    console.log("\nPhase 2: Attempting recovery with INSUFFICIENT inactivity proof...");
    const weakReset = { ...badReset, inactivityProof: { lastEvidenceHashes: ['hash1'], witnessAttestations: [] } };
    const weakError = fed.applyGovernanceReceipt(weakReset);
    console.log("Result (Expected Error):", weakError);
    if (!weakError?.includes("Insufficient evidence")) throw new Error("Expected insufficient evidence error");

    console.log("\nPhase 3: Attempting recovery with legitimate evidence but NO auditor ratification...");
    const validEvidence = Array.from({ length: DEFAULT_CONSTITUTION.recoveryInactivityThreshold }, (_, i) => `hash-${i}`);
    const legitimateReset = { ...badReset, inactivityProof: { lastEvidenceHashes: validEvidence, witnessAttestations: [] } };
    const ratificationError = fed.applyGovernanceReceipt(legitimateReset);
    console.log("Result (Expected Error):", ratificationError);
    if (!ratificationError?.includes("requires AuditorRatification")) throw new Error("Expected auditor ratification error");

    console.log("\n✅ ADVERSARIAL RECOVERY CONSTRAINTS VALIDATED!");
}

runSimulation().catch(err => {
    console.error("Simulation Failed:", err);
    process.exit(1);
});
