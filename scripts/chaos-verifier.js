"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const axios_1 = __importDefault(require("axios"));
const GATEWAY_URL = 'http://127.0.0.1:4080';
const CORE_API_URL = 'http://127.0.0.1:3001';
async function runChaosTests() {
    console.log('🧨 INITIALIZING CHAOS & RELIABILITY SUITE...\n');
    const results = [];
    const runTest = async (name, fn) => {
        console.log(`📡 TEST: ${name}...`);
        try {
            await fn();
            results.push({ name, status: 'PASS' });
            console.log(`✅ ${name} PASSED\n`);
        }
        catch (e) {
            results.push({ name, status: 'FAIL', error: e.message });
            console.log(`❌ ${name} FAILED: ${e.message}\n`);
        }
    };
    // 1. SERVICE FAILURE TEST
    await runTest('Gateway Resilience (Core-API Drop)', async () => {
        console.log('   -> Stopping core-api container...');
        (0, child_process_1.execSync)('docker compose stop core-api', { stdio: 'inherit' });
        // Check Gateway response
        try {
            await axios_1.default.get(`${GATEWAY_URL}/api/missions`);
            throw new Error('Gateway should have returned 502/504 but returned 200');
        }
        catch (e) {
            if (e.response?.status === 502 || e.response?.status === 504) {
                console.log(`   -> Gateway correctly returned ${e.response.status}`);
            }
            else {
                throw new Error(`Gateway returned unexpected status: ${e.response?.status}`);
            }
        }
        console.log('   -> Restarting core-api container...');
        (0, child_process_1.execSync)('docker compose start core-api', { stdio: 'inherit' });
        await new Promise(r => setTimeout(r, 5000)); // Wait for recovery
    });
    // 2. REDIS FAILURE TEST
    await runTest('Service Continuity (Redis Drop)', async () => {
        console.log('   -> Stopping redis container...');
        (0, child_process_1.execSync)('docker compose stop redis', { stdio: 'inherit' });
        // API should still work (degraded)
        const res = await axios_1.default.get(`${GATEWAY_URL}/health`); // Check health endpoint through gateway if possible
        // Actually direct check might be better
        const apiRes = await axios_1.default.get(`${CORE_API_URL}/health`);
        if (apiRes.data.checks.redis === false) {
            console.log('   -> Core-API correctly reported redis as UNHEALTHY');
        }
        else {
            throw new Error('Core-API failed to detect Redis failure');
        }
        console.log('   -> Restarting redis container...');
        (0, child_process_1.execSync)('docker compose start redis', { stdio: 'inherit' });
        await new Promise(r => setTimeout(r, 3000));
    });
    // 3. DATABASE FAILURE TEST
    await runTest('API Integrity (Database Drop)', async () => {
        console.log('   -> Stopping postgres container...');
        (0, child_process_1.execSync)('docker compose stop postgres', { stdio: 'inherit' });
        try {
            await axios_1.default.get(`${CORE_API_URL}/api/missions`);
            throw new Error('API should have failed without DB');
        }
        catch (e) {
            if (e.response?.status === 500) {
                console.log('   -> API correctly returned 500 Internal Error');
                if (e.response.data.requestId) {
                    console.log('   -> Traceability Check: requestId present in error payload.');
                }
            }
            else {
                throw new Error(`Unexpected status during DB outage: ${e.response?.status}`);
            }
        }
        console.log('   -> Restarting postgres container...');
        (0, child_process_1.execSync)('docker compose start postgres', { stdio: 'inherit' });
    });
    console.log('📊 CHAOS SUMMARY:');
    console.table(results);
    const allPassed = results.every(r => r.status === 'PASS');
    if (!allPassed) {
        process.exit(1);
    }
}
runChaosTests();
//# sourceMappingURL=chaos-verifier.js.map