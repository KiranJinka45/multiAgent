import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/**
 * ─── Phase 12 Tier E3: Archaeology Validation Drill ───────────────────────
 * Triggers a simulated QuarantineError on the live Core API and validates
 * that the Forensic Incident Bundle is correctly generated and parseable by
 * the chronological reconstructor.
 */

const API_URL = 'http://localhost:3010/api/v1/chaos/trigger-quarantine';
const ARCHAEOLOGY_DIR = path.resolve(process.cwd(), '.ztan/archaeology');

async function main() {
    console.log('================================================================================');
    console.log('🏛️ ZTAN PHASE 12 TIER E3: FAILURE ARCHAEOLOGY DRILL');
    console.log('================================================================================');

    // 1. Get current incident count to detect the new one
    let initialCount = 0;
    if (fs.existsSync(ARCHAEOLOGY_DIR)) {
        initialCount = fs.readdirSync(ARCHAEOLOGY_DIR).filter(f => f.startsWith('incident-') && f.endsWith('.json')).length;
    }

    console.log(`[Drill] Initiating live QuarantineError fault injection via HTTP POST to Core API...`);
    try {
        const response = await fetch(API_URL, { method: 'POST' });
        console.log(`[Drill] API Responded with HTTP ${response.status} (Expected 500 or network drop)`);
    } catch (e: any) {
        console.log(`[Drill] HTTP Request crashed as expected: ${e.message}`);
    }

    // 2. Wait for async bundle generation
    console.log(`[Drill] Waiting 3 seconds for asynchronous forensic bundling (WAL + Environment + Hashes)...`);
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 3. Verify bundle creation
    if (!fs.existsSync(ARCHAEOLOGY_DIR)) {
        console.error(`❌ [Drill] Archaeology directory was not created!`);
        process.exit(1);
    }

    const files = fs.readdirSync(ARCHAEOLOGY_DIR)
        .filter(f => f.startsWith('incident-') && f.endsWith('.json'))
        .sort((a, b) => {
            return fs.statSync(path.join(ARCHAEOLOGY_DIR, b)).mtimeMs - fs.statSync(path.join(ARCHAEOLOGY_DIR, a)).mtimeMs;
        });

    if (files.length === 0 || files.length === initialCount) {
        console.error(`❌ [Drill] No new incident bundle detected! Live API Integration Failed.`);
        process.exit(1);
    }

    const latestIncident = path.join(ARCHAEOLOGY_DIR, files[0]);
    console.log(`✅ [Drill] Forensic Bundle successfully detected: ${latestIncident}`);

    // 4. Validate Timeline Reconstruction capability
    console.log(`\n[Drill] Executing Timeline Reconstructor on the live bundle...`);
    try {
        const output = execSync(`npx tsx scripts/reconstruct-incident.ts ${latestIncident}`, { encoding: 'utf-8' });
        console.log('\n--- 📜 ARCHAEOLOGY RECONSTRUCTION OUTPUT ---');
        console.log(output);
        console.log('--- END OUTPUT ---');
        console.log(`✅ [Drill] Timeline Reconstructor successfully parsed and validated the incident!`);
    } catch (e: any) {
        console.error(`❌ [Drill] Reconstructor CLI failed!`);
        console.error(e.stdout || e.message);
        process.exit(1);
    }
}

main().catch(console.error);
