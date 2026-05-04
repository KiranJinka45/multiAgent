import axios from 'axios';
import { db } from '../packages/db/src';

const GATEWAY_URL = 'http://localhost:4081';
const AUTH_URL = 'http://localhost:4081/api/auth';

async function verifyRBAC() {
    console.log('🚀 Starting RBAC Verification Stress Test...');

    // 1. Create Test Users
    const roles = ['viewer', 'agent', 'admin'] as const;
    const users: Record<string, any> = {};

    for (const role of roles) {
        const email = `rbac-${role}-${Date.now()}@test.com`;
        const password = 'password123';
        
        console.log(`📝 Creating user with role: ${role}...`);
        
        // Signup
        const signupRes = await axios.post(`${AUTH_URL}/signup`, {
            email,
            password,
            name: `RBAC ${role}`
        }).catch(e => {
            console.error(`Signup failed for ${role}:`, e.response?.data || e.message);
            throw e;
        });

        const user = signupRes.data.user;
        const token = signupRes.data.token;

        // Manually update role in DB (signup defaults to viewer)
        if (role !== 'viewer') {
            await db.user.update({
                where: { id: user.id },
                data: { role }
            });
            
            // Re-login to get updated token with new role
            const loginRes = await axios.post(`${AUTH_URL}/login`, { email, password });
            users[role] = { ...user, token: loginRes.data.token };
        } else {
            users[role] = { ...user, token };
        }
    }

    const testCases = [
        { role: 'viewer', path: '/api/projects', method: 'get', expected: 200, name: 'Viewer can read projects' },
        { role: 'viewer', path: '/api/agents', method: 'post', expected: 403, name: 'Viewer cannot create agents' },
        { role: 'agent', path: '/api/agents', method: 'post', expected: 202, name: 'Agent can create agents', body: { name: 'Test Agent', type: 'scout' } },
        { role: 'agent', path: '/api/logs', method: 'get', expected: 403, name: 'Agent cannot read logs' },
        { role: 'admin', path: '/api/logs', method: 'get', expected: 200, name: 'Admin can read logs' },
        { role: 'unauthorized', path: '/api/projects', method: 'get', expected: 401, name: 'Unauthorized access rejected' }
    ];

    let passed = 0;
    let failed = 0;

    for (const tc of testCases) {
        const user = tc.role === 'unauthorized' ? null : users[tc.role as keyof typeof users];
        const headers = user ? { Authorization: `Bearer ${user.token}` } : {};
        
        console.log(`\n🔍 Testing: ${tc.name}`);
        
        try {
            const res = await (axios as any)[tc.method](`${GATEWAY_URL}${tc.path}`, tc.body || {}, { headers, timeout: 5000 });
            if (res.status === tc.expected) {
                console.log(`   ✅ PASSED (Status: ${res.status})`);
                passed++;
            } else {
                console.log(`   ❌ FAILED (Expected ${tc.expected}, got ${res.status})`);
                failed++;
            }
        } catch (err: any) {
            const status = err.response?.status;
            if (status === tc.expected) {
                console.log(`   ✅ PASSED (Status: ${status})`);
                passed++;
            } else {
                console.log(`   ❌ FAILED (Expected ${tc.expected}, got ${status || err.message})`);
                if (err.response?.data) console.log(`      Error Detail:`, err.response.data);
                failed++;
            }
        }
    }

    console.log('\n--- RBAC Verification Summary ---');
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);

    if (failed === 0) {
        console.log('\n🏆 RBAC & Security Layer: FULLY VERIFIED');
    } else {
        console.log('\n⚠️ RBAC & Security Layer: ISSUES DETECTED');
        process.exit(1);
    }
}

verifyRBAC().catch(err => {
    console.error('Fatal verification error:', err);
    process.exit(1);
});
