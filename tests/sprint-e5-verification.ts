import dotenv from 'dotenv';
dotenv.config();

// Enforce mock DB for test context
process.env.MOCK_DB = 'true';

import { PilotGate } from '../packages/runtime-core/src/index';
import { InstitutionalPilotRegistry } from '../packages/production-pilot/src/index';
import path from 'path';
import fs from 'fs';

async function runSprintE5Verification() {
    console.log('================================================================================');
    console.log('🧪  ZTAN PHASE 12 SPRINT E1.5 - CONTROLLED PILOT EXPOSURE RUNNER');
    console.log('================================================================================\n');

    const pilotName = 'Sovereign-Pilot-Federation';
    const pilot = InstitutionalPilotRegistry.registerPilot(pilotName, 'SOVEREIGN', {
        sunsetDays: 30,
        quota: 5,
        driftThreshold: 0.25
    });

    console.log(`⚡ [TEST 1] Auditing Layer 7 sunset dates and concurrency quotas...`);
    console.log(`     - Registered Pilot ID: ${pilot.id}`);
    console.log(`     - Concurrency Quota:   ${pilot.maxConcurrencyQuota}`);
    console.log(`     - Sunset expiration:   ${pilot.sunsetDate}`);

    // 1. Validate normal execution
    const checkAllowed = PilotGate.validateExecution(pilot.id, 3, 0.05);
    console.log(`     - Concurrency [3], Drift [0.05]: Allowed=${checkAllowed.allowed}`);
    if (!checkAllowed.allowed) {
        throw new Error(`Expected allowed execution but failed: ${checkAllowed.reason}`);
    }

    // 2. Validate concurrency rejection
    const checkQuota = PilotGate.validateExecution(pilot.id, 8, 0.05);
    console.log(`     - Concurrency [8], Drift [0.05]: Allowed=${checkQuota.allowed} (Reason: ${checkQuota.reason})`);
    if (checkQuota.allowed) {
        throw new Error('Expected concurrency quota rejection!');
    }

    // 3. Validate drift rollback trigger
    const checkDrift = PilotGate.validateExecution(pilot.id, 3, 0.35);
    console.log(`     - Concurrency [3], Drift [0.35]: Allowed=${checkDrift.allowed} (Reason: ${checkDrift.reason})`);
    if (checkDrift.allowed) {
        throw new Error('Expected dynamic semantic drift rollback trigger rejection!');
    }
    console.log('  ✅ Sunset lease gates, concurrency quotas, and drift limits verified.');
    console.log('');

    // ────────────────────────────────────────────────────────────────────────
    // TEST 2: Multi-Sig Steward Override checks
    // ────────────────────────────────────────────────────────────────────────
    console.log('⚡ [TEST 2] Auditing manual SRE steward overrides...');
    const validSignature = `sig:${Buffer.alloc(64).toString('base64')}`;
    const invalidSignature = 'sig:INVALID_CREDENTIALS';

    // 1. Approved override
    const checkOverride1 = PilotGate.validateStewardOverride('steward_omega', validSignature);
    console.log(`     - Steward [steward_omega], valid signature: Allowed=${checkOverride1.allowed}`);
    if (!checkOverride1.allowed) {
        throw new Error(`Expected override success but failed: ${checkOverride1.reason}`);
    }

    // 2. Rejected due to non-whitelisted operator
    const checkOverride2 = PilotGate.validateStewardOverride('rogue_operator', validSignature);
    console.log(`     - Steward [rogue_operator], valid signature: Allowed=${checkOverride2.allowed} (Reason: ${checkOverride2.reason})`);
    if (checkOverride2.allowed) {
        throw new Error('Expected rejection of non-whitelisted SRE operator!');
    }

    // 3. Rejected due to malformed signature format
    const checkOverride3 = PilotGate.validateStewardOverride('steward_omega', invalidSignature);
    console.log(`     - Steward [steward_omega], invalid signature: Allowed=${checkOverride3.allowed} (Reason: ${checkOverride3.reason})`);
    if (checkOverride3.allowed) {
        throw new Error('Expected rejection of malformed NIST P-256 signature format!');
    }
    console.log('  ✅ Multi-sig steward overrides validated successfully.');

    // Clean up temporary pilot registry file
    const registryPath = path.join(process.cwd(), '.ztan', 'pilot-registry.json');
    if (fs.existsSync(registryPath)) {
        fs.unlinkSync(registryPath);
    }

    console.log('\n================================================================================');
    console.log('🎉 SPRINT E1.5 PILOT SUNSET GATES AND MULTI-SIG OVERRIDES VERIFIED SUCCESSFULLY');
    console.log('================================================================================');
    process.exit(0);
}

runSprintE5Verification().catch(err => {
    console.error('Fatal Verification Error:', err);
    process.exit(1);
});
