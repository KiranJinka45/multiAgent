import fs from 'fs';
import path from 'path';
import { WitnessFederation } from '../packages/utils/src/transparency/witness-federation';
import { GovernanceReceipt } from '../packages/utils/src/transparency/governance';

async function restoreInstitution() {
    console.log("--- Institutional Black Box Recovery (Genesis Reconstruction) ---");

    const logPath = path.join(__dirname, '../archives/LEGAL_TRACE.json');
    if (!fs.existsSync(logPath)) {
        console.error("❌ Fatal: LEGAL_TRACE.json not found. Black box recovery impossible.");
        process.exit(1);
    }

    const logData = JSON.parse(fs.readFileSync(logPath, 'utf8')) as { receipt: GovernanceReceipt }[];
    console.log(`Replaying ${logData.length} actions from institutional history...`);

    // In a real system, we'd start with a minimal bootstrap federation
    const fed = new WitnessFederation([], 0); 
    
    let actionsApplied = 0;
    for (const entry of logData) {
        const error = fed.applyGovernanceReceipt(entry.receipt);
        if (error) {
            console.error(`❌ Recovery Error at Sequence ${entry.receipt.sequenceNumber}: ${error}`);
            process.exit(1);
        }
        actionsApplied++;
    }

    console.log(`\n✅ RECOVERY COMPLETE!`);
    console.log(`Actions Replayed: ${actionsApplied}`);
    console.log(`Final GRoot:      ${fed.getGovernanceRoot()}`);
    console.log(`Final Epoch:      ${fed.getEpochId()}`);
    console.log(`Current State:    ${fed.getInstitutionalHealth().state}`);
    
    return fed;
}

restoreInstitution().catch(console.error);
