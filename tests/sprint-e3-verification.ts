import dotenv from 'dotenv';
dotenv.config();

// Enforce fallback environments for local test isolation
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:password@127.0.0.1:54399/multiagent';
process.env.MOCK_DB = process.env.MOCK_DB || 'true';

import { FailureBundleGenerator } from '../packages/runtime-core/src/archaeology/failure-bundle-generator';
import { IncidentReplayer } from '../packages/runtime-core/src/archaeology/incident-replay';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '../');

async function runSprintE3Verification() {
    console.log('================================================================================');
    console.log('🧪  ZTAN PHASE 12 SPRINT E1.3 - FAILURE ARCHAEOLOGY VERIFICATION RUNNER');
    console.log('================================================================================\n');

    // 1. Instantiate the failure bundle generator
    const generator = new FailureBundleGenerator(workspaceRoot);

    // 2. Generate a simulated quarantine incident
    console.log('⚡ [STEP 1] Generating simulated quarantine incident bundle...');
    const errors = [
        '[ENV_AUDIT_ERROR] Shadow override variable detected: "unauthorized_proxy_override".',
        '[OPA_REST_GATE_DENIAL] fail-closed OPA denial on write. Target role mismatch: operator "rogue_operator" is not allowed.',
        '[STORAGE_MERKLE_CHAIN_ERROR] Lineage integrity break on Ledger block #22. Expected prevHash mismatch.'
    ];

    let bundlePath = '';
    try {
        bundlePath = await generator.generateIncidentBundle(errors);
        
        if (fs.existsSync(bundlePath)) {
            console.log('  ✅ Incident forensic bundle successfully captured.');
            console.log(`     └─ File: ${bundlePath}`);
        } else {
            throw new Error('Forensic bundle was not created!');
        }
    } catch (e: any) {
        console.error(`  ❌ Failed to generate incident bundle: ${e.message}`);
        process.exit(1);
    }
    console.log('');

    // 3. Perform programmatic audit verify
    console.log('⚡ [STEP 2] Programmatically auditing incident bundle data...');
    try {
        const bundle = IncidentReplayer.loadBundle(bundlePath);
        const audit = IncidentReplayer.auditBundle(bundle);

        console.log(`     └─ Incident ID:          ${audit.incidentId}`);
        console.log(`     └─ Verdict Classification: ${audit.verdict}`);
        console.log(`     └─ Primary Trigger:       ${audit.primaryTrigger}`);
        console.log(`     └─ Total mapped events:   ${audit.totalEvents}`);
        console.log(`     └─ Ledger health:         ${audit.ledgerChainHealthy ? 'PRISTINE' : 'CORRUPTED'}`);

        if (audit.verdict !== 'POLICY_OPA_GATE_DENIAL') {
            throw new Error(`Expected cause classification: POLICY_OPA_GATE_DENIAL, got: ${audit.verdict}`);
        }
        console.log('  ✅ Snapshot classifications validated successfully.');
    } catch (e: any) {
        console.error(`  ❌ Programmatic audit failed: ${e.message}`);
        process.exit(1);
    }
    console.log('');

    // 4. Test reconstruction CLI replay output
    console.log('⚡ [STEP 3] Running reconstructor CLI to replay chronology trace...');
    try {
        const relativeBundlePath = path.relative(workspaceRoot, bundlePath);
        console.log(`     └─ Executing: npx tsx scripts/reconstruct-incident.ts ${relativeBundlePath}\n`);
        
        const output = execSync(`npx tsx scripts/reconstruct-incident.ts ${relativeBundlePath}`, {
            cwd: workspaceRoot,
            encoding: 'utf8'
        });

        console.log(output);
        console.log('  ✅ CLI incident reconstruction replayed successfully.');
    } catch (e: any) {
        console.error(`  ❌ CLI replay failed: ${e.message}`);
        process.exit(1);
    }

    console.log('================================================================================');
    console.log('🎉 SPRINT E1.3 FAILURE ARCHAEOLOGY & REPLAY SCIENCE VERIFIED SUCCESSFULLY');
    console.log('================================================================================');
    process.exit(0);
}

runSprintE3Verification().catch(err => {
    console.error('Fatal Verification Error:', err);
    process.exit(1);
});
