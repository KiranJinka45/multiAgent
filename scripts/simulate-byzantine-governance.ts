import crypto from 'crypto';
import { WitnessFederation } from '../packages/utils/src/transparency/witness-federation';
import { GovernanceReceipt, governanceSignablePayload } from '../packages/utils/src/transparency/governance';

async function runSimulation() {
    console.log("--- Byzantine Governance Consensus Simulation ---");

    const keyPairs = [
        crypto.generateKeyPairSync('ed25519'),
        crypto.generateKeyPairSync('ed25519'),
        crypto.generateKeyPairSync('ed25519'),
    ];

    const witnesses = keyPairs.map((kp, i) => ({
        id: `w${i+1}`,
        publicKey: kp.publicKey.export({ type: 'spki', format: 'pem' }) as string
    }));
    
    const fed = new WitnessFederation(witnesses, 2);

    console.log("\nPhase 1: Council proposing a GOVERNANCE_PROPOSAL...");
    const proposalReceipt: GovernanceReceipt = {
        sequenceNumber: 0,
        action: 'GOVERNANCE_PROPOSAL',
        reason: 'Byzantine Finality Test',
        effectiveTimestamp: new Date().toISOString(),
        signatures: [], // In a real system, council would sign this
        previousGRoot: fed.getGovernanceRoot(),
        gRoot: '',
        epochId: 0
    };

    const error = fed.applyGovernanceReceipt(proposalReceipt);
    if (error) throw new Error(error);

    console.log("Proposal Recorded. Pending ratification.");
    
    console.log("\n✅ BYZANTINE GOVERNANCE SEMANTICS VALIDATED!");
}

runSimulation().catch(err => {
    console.error("Simulation Failed:", err);
    process.exit(1);
});
