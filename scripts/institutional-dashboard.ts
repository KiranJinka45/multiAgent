import { WitnessFederation } from '../packages/utils/src/transparency/witness-federation';
import readline from 'readline';

async function showDashboard() {
    const fed = (global as any).fed || new WitnessFederation([], 0);
    
    const render = () => {
        const health = fed.getInstitutionalHealth();
        
        console.clear();
        console.log("====================================================");
        console.log("          ZTAN INSTITUTIONAL DASHBOARD              ");
        console.log("====================================================");
        console.log(`State:     [${health.state}]`);
        console.log(`Epoch:     ${health.epochId}`);
        console.log(`GRoot:     ${health.governanceRoot.slice(0, 16)}...`);
        console.log("----------------------------------------------------");
        console.log(`Witnesses: ${health.witnesses.total} (Need ${health.witnesses.threshold})`);
        console.log(`Council:   ${health.council.members.length} (Need ${health.council.threshold})`);
        console.log(`Auditors:  ${health.auditors.members.length} (Need ${health.auditors.threshold})`);
        console.log("----------------------------------------------------");
        console.log(`Guardians: ${health.guardians.length} Registered`);
        for (const g of health.guardians) {
            console.log(` - ${g.name} (${g.id.slice(0, 8)})`);
        }
        console.log("----------------------------------------------------");
        if (health.pendingRecovery) {
            console.log("⚠️ PENDING RECOVERY DETECTED!");
            console.log(`   Expires: ${health.pendingRecovery.expiresAt}`);
        } else {
            console.log("✅ Institutional integrity verified.");
        }
        console.log("====================================================");
        console.log("Press Ctrl+C to exit.");
    };

    render();
}

showDashboard().catch(console.error);
