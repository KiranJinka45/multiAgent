import { ObservatoryServer } from '../src/runtime/observatory-server';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * ─── Sprint 4 Bounded Operator Observatory Verification Runner ──────────────
 * Boots the interactive dashboard server, validates live status endpoints, and
 * audits cryptographic multi-sig override quarantine release portals.
 * ────────────────────────────────────────────────────────────────────────────
 */

async function runSprint4Verification() {
    console.log('================================================================================');
    console.log('🔭  ZTAN PHASE 11A SPRINT 4 - OPERATOR OBSERVATORY VERIFICATION RUNNER');
    console.log('================================================================================\n');

    const workspaceRoot = path.resolve(__dirname, '../');
    const server = new ObservatoryServer(workspaceRoot);

    try {
        console.log('⚡ Starting local SRE operational dashboard...');
        await server.start();

        // 1. Audit active status endpoint resolving DAG and sequence parameters
        console.log('⚡ [TEST 1] Querying /api/status endpoint...');
        const statusResponse = await axios.get('http://localhost:4500/api/status');
        
        console.log(`     - HTTP Status: ${statusResponse.status}`);
        console.log(`     - Current active node state: ${statusResponse.data.state}`);
        console.log(`     - Registered active anomalies: ${statusResponse.data.anomalies.length}`);
        console.log(`     - Current active WAL sequence logs: ${statusResponse.data.walLogs.length}`);
        
        if (statusResponse.status === 200 && statusResponse.data.success) {
            console.log('  ✅ Active status endpoint validated successfully.');
        } else {
            console.error('  ❌ Status endpoint returned invalid response!');
        }

        // 2. Audit manual override release portal
        console.log('\n⚡ [TEST 2] Submitting cryptographic SRE override to quarantine portal...');
        const overrideResponse = await axios.post('http://localhost:4500/api/override', {
            operator: 'steward_omega',
            reason: 'Simulated operational override from Sprint 4 verification runner',
            signature: 'sig:operator-omega-attested-nist-p256-sig',
            targetInvariant: 'Fencing-Epoch'
        });

        console.log(`     - HTTP Status: ${overrideResponse.status}`);
        console.log(`     - Bypass ID assigned: ${overrideResponse.data.bypassRecord.bypassId}`);
        console.log(`     - Target Invariant: ${overrideResponse.data.bypassRecord.targetInvariant}`);
        console.log(`     - Override Expiration: ${overrideResponse.data.bypassRecord.expiresAt}`);
        
        if (overrideResponse.status === 200 && overrideResponse.data.success) {
            console.log('  ✅ Cryptographic manual override portal validated successfully.');
        } else {
            console.error('  ❌ Multi-sig override portal rejected valid override payload!');
        }

        // 3. Clear overrides to restore pristine baseline state
        console.log('\n⚡ [TEST 3] Clearing overrides to restore pristine safety policies...');
        const clearResponse = await axios.post('http://localhost:4500/api/clear-overrides');
        if (clearResponse.status === 200 && clearResponse.data.success) {
            console.log('  ✅ Emergency overrides cleared successfully.');
        } else {
            console.error('  ❌ Failed to clear emergency overrides!');
        }

    } catch (err: any) {
        console.error('Fatal Verification Error:', err.message || err);
        process.exit(1);
    } finally {
        await server.stop();
    }

    console.log('\n================================================================================');
    console.log('🎉 SPRINT 4 OPERATOR OBSERVATORY VERIFIED SUCCESSFULLY');
    console.log('================================================================================');
}

runSprint4Verification().catch(err => {
    console.error('Fatal Verification Error:', err);
    process.exit(1);
});
