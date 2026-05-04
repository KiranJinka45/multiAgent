"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_ts_1 = require("../packages/db/src/index.ts");
const context_ts_1 = require("../packages/db/src/context.ts");
const uuid_1 = require("uuid");
async function verifyIsolation() {
    console.log('🚀 Starting Multi-Tenant Isolation Stress Test...');
    const tenantA = 'tenant-alpha-' + Math.random().toString(36).substring(7);
    const tenantB = 'tenant-beta-' + Math.random().toString(36).substring(7);
    const executionId = (0, uuid_1.v4)();
    console.log(`📝 Creating record for ${tenantA}...`);
    // Step 1: Create record in Tenant A context
    await context_ts_1.contextStorage.run({ requestId: 'test-1', tenantId: tenantA }, async () => {
        const created = await index_ts_1.db.executionLog.create({
            data: {
                executionId,
                stage: 'TEST_ISOLATION',
                status: 'INIT',
                message: 'Testing hard isolation'
            }
        });
        console.log('✅ Record created successfully in Tenant A context. Saved TenantId:', created.tenantId);
    });
    // Step 2: Attempt to read from Tenant B context
    console.log(`🕵️ Attempting to read record from ${tenantB} context...`);
    await context_ts_1.contextStorage.run({ requestId: 'test-2', tenantId: tenantB }, async () => {
        const record = await index_ts_1.db.executionLog.findFirst({
            where: { executionId }
        });
        if (record) {
            console.error('❌ FAILURE: Data leakage detected!');
            console.error('   Expected Record: NULL');
            console.error('   Got Record TenantId:', record.tenantId);
            process.exit(1);
        }
        else {
            console.log('✅ SUCCESS: Tenant B cannot see Tenant A data (Scoping active).');
        }
    });
    // Step 3: Attempt to read without context (should be global/blocked or default)
    console.log('🕵️ Attempting to read record without tenant context...');
    const globalRecord = await index_ts_1.db.executionLog.findFirst({
        where: { executionId }
    });
    if (globalRecord) {
        console.log('ℹ️ Global read successful (System/Admin bypass or no context set).');
    }
    else {
        console.log('✅ Scoping active even without context (safe default).');
    }
    // Step 4: Verify Admin Bypass
    console.log('🕵️ Verifying Platform Admin bypass...');
    await context_ts_1.contextStorage.run({ requestId: 'test-admin', tenantId: 'platform-admin' }, async () => {
        const adminRecord = await index_ts_1.db.executionLog.findFirst({
            where: { executionId }
        });
        if (adminRecord) {
            console.log('✅ SUCCESS: Platform Admin can see all tenant data.');
        }
        else {
            console.error('❌ FAILURE: Platform Admin is blocked by isolation.');
            process.exit(1);
        }
    });
    console.log('\n✨ Multi-Tenant Isolation Certified!');
    process.exit(0);
}
verifyIsolation().catch(err => {
    console.error('💥 Test Suite Crashed:', err);
    process.exit(1);
});
//# sourceMappingURL=verify-isolation.js.map