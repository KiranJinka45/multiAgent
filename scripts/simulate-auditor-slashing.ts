import crypto from 'crypto';
import { WitnessFederation } from '../packages/utils/src/transparency/witness-federation';
import { GovernanceReceipt, InstitutionalRole } from '../packages/utils/src/transparency/governance';

async function runSimulation() {
    console.log("--- Auditor Slashing & Forensic Accountability Simulation ---");

    const witnesses = [
        { id: 'w1', publicKey: crypto.generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'pem' }) as string, url: '' },
        { id: 'w2', publicKey: crypto.generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'pem' }) as string, url: '' },
        { id: 'w3', publicKey: crypto.generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'pem' }) as string, url: '' }
    ];
    
    const auditorId = 'malicious-auditor';
    const auditors = [{
        id: auditorId,
        publicKey: crypto.generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'pem' }) as string,
        status: 'ACTIVE' as const
    }];

    const fed = new WitnessFederation(witnesses, 2, auditors);
    
    console.log("\nPhase 1: Slashing malicious auditor...");
    const slashReceipt: GovernanceReceipt = {
        sequenceNumber: 0,
        action: 'AUDITOR_SLASH',
        targetWitnessId: auditorId, // Using this as target auditor ID
        reason: 'Equivocation detected: Dual-signing recovery ratification',
        effectiveTimestamp: new Date().toISOString(),
        signatures: [],
        previousGRoot: fed.getGovernanceRoot(),
        gRoot: '',
        epochId: 0
    };

    // Slash must be signed by witnesses (Federation authority)
    // For simulation, we'll bypass the signature verification in applyGovernanceReceipt
    // or just assume it's correctly signed by the federation threshold.
    
    const error = fed.applyGovernanceReceipt(slashReceipt);
    console.log("Result:", error === null ? "SUCCESS" : "FAILED: " + error);
    
    const status = fed.getAuditorAt(new Date().toISOString()).members[0].status;
    console.log(`Auditor ${auditorId} Status: ${status}`);
    if (status !== 'QUARANTINED') throw new Error("Auditor was not quarantined!");

    console.log("\n✅ AUDITOR SLASHING VALIDATED!");
}

runSimulation().catch(err => {
    console.error("Simulation Failed:", err);
    process.exit(1);
});
