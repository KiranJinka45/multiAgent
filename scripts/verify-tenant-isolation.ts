import { quotaManager } from '../packages/core-engine/src/quota-manager.js';
import { isolationWatchdog } from './isolation-watchdog.js';

/**
 * ZTAN Multi-Tenant Isolation Verification
 * Certifies that tenant boundaries and quotas are strictly enforced.
 */
async function verifyIsolation() {
    console.log('🛡️ Starting ZTAN Multi-Tenant Isolation Verification (Institutional Focus)...');

    const tenantA = 'tenant-alice-001';
    const tenantB = 'tenant-bob-002';

    // 1. Verify Quota Enforcement (Compute)
    console.log('\n🔍 Test 1: Verifying Quota Enforcement (Compute)...');
    
    // Set a very low quota for testing
    quotaManager.setQuota(tenantA, { computeCapMs: 100, memoryCapBytes: 1024 * 1024 });

    console.log(`   - Simulating high-compute mission for ${tenantA}...`);
    
    // Record usage until violation
    let result = { allowed: true };
    for (let i = 0; i < 6; i++) {
        result = quotaManager.recordUsage(tenantA, { computeMs: 20 });
        if (!result.allowed) break;
    }

    if (result.allowed) {
        throw new Error('❌ Quota enforcement FAILED: Mission exceeded compute cap without trigger.');
    }
    console.log(`   ✅ Quota enforcement verified: ${result.violation}`);

    // 2. Verify Cross-Tenant Leak Prevention
    console.log('\n🔍 Test 2: Verifying Cross-Tenant Leak Prevention...');
    // Verify that Tenant B usage is independent of Tenant A
    const usageB = quotaManager.getUsage(tenantB);
    if (usageB.computeMs !== 0) {
        throw new Error('❌ Cross-tenant leak: Tenant B usage updated by Tenant A actions.');
    }
    
    console.log('   ✅ Evidence isolation verified: Usage counters are strictly tenant-scoped.');

    // 3. Verify Isolation Watchdog
    console.log('\n🔍 Test 3: Verifying Isolation Watchdog Integration...');
    isolationWatchdog.registerTenant(tenantA);
    const status = isolationWatchdog.constructor.getIsolationStatus(tenantA);
    
    if (status.isolationIntegrity !== 'CERTIFIED') {
        throw new Error('❌ Watchdog integration FAILED: Dossier status not certified.');
    }
    
    console.log('   ✅ Watchdog integration verified: Isolation status successfully injected.');

    console.log('\n✅ MULTI-TENANT ISOLATION CERTIFIED.');
}

verifyIsolation().catch(err => {
    console.error(`\n❌ ISOLATION VERIFICATION FAILED: ${err.message}`);
    process.exit(1);
});
