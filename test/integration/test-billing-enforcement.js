"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const db_1 = require("@packages/db");
async function testEnforcement() {
    console.log('🧪 TESTING BILLING ENFORCEMENT (HARD LIMIT)...');
    const testTenantId = 'test-enforcement-tenant';
    // 1. Ensure tenant exists and force quota to 0 for testing
    console.log(`📉 Provisioning test tenant ${testTenantId} with 0 quota...`);
    await db_1.db.tenant.upsert({
        where: { id: testTenantId },
        update: { dailyQuota: 0 },
        create: {
            id: testTenantId,
            name: 'Enforcement Test Tenant',
            dailyQuota: 0
        }
    });
    // 2. Attempt mission submission
    console.log('🚀 Attempting mission submission (should fail)...');
    try {
        const response = await axios_1.default.post('http://localhost:4081/api/generate', {
            prompt: 'Test mission for enforcement',
            projectId: 'test_proj'
        }, {
            headers: { 'x-tenant-id': testTenantId } // Assuming your auth/middleware handles this
        });
        console.log('❌ FAIL: Mission was allowed! Enforcement not working.');
    }
    catch (err) {
        if (err.response?.status === 403) {
            console.log('✅ SUCCESS: Mission rejected with 403 (Forbidden).');
            console.log('Reason:', err.response.data.reason);
        }
        else {
            console.error('❌ FAIL: Unexpected error status:', err.response?.status);
            console.error(err.response?.data);
        }
    }
    // 3. Reset quota back to 10
    console.log('📈 Resetting tenant quota to 10...');
    await db_1.db.tenant.update({
        where: { id: testTenantId },
        data: { dailyQuota: 10 }
    });
}
testEnforcement().catch(console.error);
//# sourceMappingURL=test-billing-enforcement.js.map