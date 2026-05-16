/**
 * rehearse-upgrades.ts
 * 
 * Automated ecosystem migration readiness script for CI/CD pipelines.
 */

import { MigrationRehearsal } from '../packages/utils/src/rehearsal.js';
import { ArchaeologyEngine } from '../packages/utils/src/archaeology.js';

const TARGETS = [
    'node:22-lts',
    'typescript:5.9.3',
    'prisma:6.0.0',
    'esm:strict'
];

async function run() {
    console.log('🚀 Starting Automated Ecosystem Migration Rehearsal...');
    
    for (const target of TARGETS) {
        console.log(`\n[REHEARSAL] Testing target: ${target} in SANDBOX: ci-rehearsal-${Date.now()}`);
        const result = await MigrationRehearsal.rehearse(target, 'smoke-test-suite', `sandbox-${target.replace(':', '-')}`);
        
        if (result.status === 'SUCCESS') {
            console.log(`✅ Success: ${target} is stable.`);
        } else {
            console.error(`❌ Failure: ${target} failed with error: ${result.error}`);
        }
    }

    console.log('\n--- FINAL READINESS SUMMARY & CERTIFICATION ---');
    for (const target of TARGETS) {
        const report = MigrationRehearsal.generateReadinessReport(target);
        console.log(report);
        
        const cert = MigrationRehearsal.certifyReadiness(target);
        console.log(`CERTIFICATION: [${cert.signal}] - ${cert.reason}\n`);
    }
    
    // Prune old replays per Tiered Governance Policy
    const { prunedCount } = ArchaeologyEngine.pruneReplays();
    console.log(`\n🧹 Governance: Pruned ${prunedCount} stale forensic replays (Tiered Policy).`);
}

run().catch(err => {
    console.error('Fatal error during rehearsal:', err);
    process.exit(1);
});
