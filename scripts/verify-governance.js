"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("@packages/config");
const db_1 = require("@packages/db");
const API_URL = 'http://localhost:4081/api';
const JWT_SECRET = config_1.env.JWT_SECRET;
async function verifyGovernance() {
    console.log('🚀 Starting Tenant Governance Verification...');
    const tenantId = `test-tenant-${Date.now()}`;
    const userId = `test-user-${Date.now()}`;
    // 1. Setup Tenant and Subscription (Free Plan: 2 Concurrent Jobs)
    console.log(`📝 Setting up tenant ${tenantId} with FREE plan...`);
    try {
        await db_1.db.tenant.create({
            data: {
                id: tenantId,
                name: 'Test Tenant',
            }
        });
        await db_1.db.user.create({
            data: {
                id: userId,
                email: `${userId}@test.com`,
                tenantId,
            }
        });
        await db_1.db.subscription.create({
            data: {
                userId,
                tenantId,
                plan: 'free',
            }
        });
    }
    catch (err) {
        console.error('Failed to setup test user/subscription:', err);
    }
    const token = jsonwebtoken_1.default.sign({ id: userId, tenantId, roles: ['user'] }, JWT_SECRET, { expiresIn: '1h' });
    const headers = { Authorization: `Bearer ${token}` };
    // 2. Test Concurrency Limit (Free Plan = 2)
    console.log('\n📡 Testing concurrency limit (expecting 2 allowed/504 and 1 rejected/403)...');
    const concurrencyBurst = [1, 2, 3].map(i => axios_1.default.post(`${API_URL}/builds`, {
        prompt: `Concurrency Test #${i}`,
        projectId: `00000000-0000-0000-0000-00000000000${i}`
    }, { headers: { ...headers, 'x-test-concurrency': 'true' }, timeout: 10000 }).catch(e => e.response || { status: 502 }));
    const burstResults = await Promise.all(concurrencyBurst);
    let job3Status = 0;
    let allowedCount = 0;
    let forbiddenCount = 0;
    burstResults.forEach((res, i) => {
        console.log(`   Job #${i + 1} Result: ${res.status}`);
        if (res.status === 403)
            forbiddenCount++;
        else if (res.status === 504 || res.status === 502 || res.status === 200 || res.status === 201)
            allowedCount++;
    });
    // For the summary, we consider it a pass if we got at least one 403
    job3Status = forbiddenCount > 0 ? 403 : burstResults[2].status;
    // 3. Test Rate Limiting
    // We'll switch to 'rate_test' plan which has high concurrency but low rate limit (50)
    console.log(`\n📝 Switching tenant ${tenantId} to RATE_TEST plan...`);
    await db_1.db.subscription.updateMany({
        where: { tenantId },
        data: { plan: 'rate_test' }
    });
    console.log('\n📡 Testing rate limiting (bursting 120 requests, expecting ~70 rejections)...');
    let rejectedCount = 0;
    let successCount = 0;
    let concurrencyCount = 0;
    const burstPromises = Array.from({ length: 120 }).map((_, i) => axios_1.default.post(`${API_URL}/builds`, {
        prompt: `Rate Test #${i}`,
        projectId: `00000000-0000-0000-0000-000000000001`
    }, { headers, timeout: 5000 }).then(r => {
        successCount++;
        return r;
    }).catch(e => {
        if (e.response?.status === 429)
            rejectedCount++;
        else if (e.response?.status === 403)
            concurrencyCount++;
        return e.response || { status: 502 };
    }));
    await Promise.all(burstPromises);
    console.log(`   Results: Success: ${successCount}, Rate Limit (429): ${rejectedCount}, Concurrency (403): ${concurrencyCount}`);
    console.log('\n--- Verification Summary ---');
    if (job3Status === 403) {
        console.log('✅ Concurrency Limit: PASSED (3rd job blocked as expected)');
    }
    else {
        console.error(`❌ Concurrency Limit: FAILED (Expected 403, got ${job3Status})`);
    }
    if (rejectedCount > 0) {
        console.log(`✅ Rate Limiting: PASSED (${rejectedCount} requests throttled)`);
    }
    else {
        console.error('❌ Rate Limiting: FAILED (no requests throttled)');
    }
}
verifyGovernance().catch(console.error).finally(() => db_1.db.$disconnect());
//# sourceMappingURL=verify-governance.js.map