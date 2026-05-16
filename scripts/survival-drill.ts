import * as readline from 'node:readline';
import { logger } from '../packages/observability/src/index.js';

/**
 * ZTAN Phase 9.3: Operational Survivability Drill
 * This script guides a non-author operator through critical recovery scenarios.
 */
async function startDrill() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const ask = (query: string) => new Promise<string>(resolve => rl.question(query, resolve));

    console.log('\n🏛️  WELCOME TO THE ZTAN SURVIVAL DRILL');
    console.log('------------------------------------');
    console.log('This drill verifies that you can survive a critical failure.');
    console.log('Target Stakeholder: Non-Author Operator (SRE/Admin)\n');

    console.log('CHOOSE A SCENARIO:');
    console.log('1. [STATE_CORRUPTION] Cell State Reconstruction');
    console.log('2. [IDENTITY_BREACH] Governance Key Rotation');
    console.log('3. [ISOLATION_LEAK] Manual Cell Quarantine\n');

    const choice = await ask('Select scenario (1-3): ');

    if (choice === '1') {
        await runStateCorruptionDrill(ask);
    } else if (choice === '2') {
        await runIdentityBreachDrill(ask);
    } else if (choice === '3') {
        await runIsolationLeakDrill(ask);
    } else {
        console.log('Invalid choice. Aborting drill.');
    }

    rl.close();
}

async function runStateCorruptionDrill(ask: (q: string) => Promise<string>) {
    console.log('\n🚨 SCENARIO: State Corruption Detected in Cell [cell-001]');
    console.log('The database hash does not match the latest signed evidence packet.');
    console.log('Action required: Manual Reconstruction from Archive.\n');

    console.log('STEP 1: Locate the latest verified dossier in the /evidence directory.');
    await ask('Press ENTER once you have identified the latest hash...');

    console.log('\nSTEP 2: Run the reconstruction utility.');
    console.log('Command: npx tsx scripts/cell-resurrection.ts --cell cell-001 --packet <hash>');
    const hash = await ask('Enter the evidence packet hash to restore: ');

    if (hash.startsWith('hash-')) {
        console.log('\n⏳ VERIFYING LINEAGE...');
        await sleep(1000);
        console.log('✅ Lineage verified. Reconstructing state from signed delta...');
        await sleep(2000);
        console.log('\n🏁 DRILL COMPLETE: Cell [cell-001] is back in consensus.');
        console.log('Success Rate: 100% (Operator correctly identified lineage hash).');
    } else {
        console.log('\n❌ ERROR: Invalid hash provided. Security boundary violation.');
        console.log('Drill Failed. Please consult the OPERATOR_SURVIVAL_KIT.md.');
    }
}

async function runIdentityBreachDrill(ask: (q: string) => Promise<string>) {
    console.log('\n🚨 SCENARIO: Governance Key Compromised');
    console.log('Secret key for Cell [cell-001] has been leaked.');
    console.log('Action required: Immediate Key Rotation & Revocation.\n');

    console.log('STEP 1: Revoke the existing key in the Governance Root.');
    await ask('Press ENTER once you have updated the governance-root.json...');

    console.log('\nSTEP 2: Generate a new institutional identity.');
    console.log('Command: npx tsx scripts/admin-setup.ts --rotate cell-001');
    await ask('Press ENTER once rotation is complete...');

    console.log('\n⏳ RE-SIGNING EPOCH HISTORY...');
    await sleep(2000);
    console.log('✅ Identity rotated. New key version: 2');
    console.log('\n🏁 DRILL COMPLETE: Institutional trust anchor restored.');
}

async function runIsolationLeakDrill(ask: (q: string) => Promise<string>) {
    console.log('\n🚨 SCENARIO: Isolation Breach (Sandbox Leak)');
    console.log('Process in Cell [cell-001] attempted to escape the gVisor sandbox.');
    console.log('Action required: Manual Quarantine & Forensic Snapshot.\n');

    console.log('STEP 1: Trigger immediate cell quarantine.');
    console.log('Command: npx tsx scripts/isolation-watchdog.ts --quarantine cell-001');
    await ask('Press ENTER once quarantine is active...');

    console.log('\nSTEP 2: Export forensic evidence pack for audit.');
    console.log('Command: npx tsx scripts/generate-trust-report.ts --forensic');
    await ask('Press ENTER once evidence is exported...');

    console.log('\n🏁 DRILL COMPLETE: Blast radius contained.');
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

startDrill().catch(err => {
    console.error(`\n❌ DRILL FAILED: ${err.message}`);
    process.exit(1);
});
