import { execSync } from 'child_process';
import axios from 'axios';

const GATEWAY_URL = 'http://127.0.0.1:4080';
const CORE_API_URL = 'http://127.0.0.1:3001';

async function runChaosTests() {
  console.log('🧨 INITIALIZING CHAOS & RELIABILITY SUITE...\n');
  const results: any[] = [];

  const runTest = async (name: string, fn: () => Promise<void>) => {
    console.log(`📡 TEST: ${name}...`);
    try {
      await fn();
      results.push({ name, status: 'PASS' });
      console.log(`✅ ${name} PASSED\n`);
    } catch (e: any) {
      results.push({ name, status: 'FAIL', error: e.message });
      console.log(`❌ ${name} FAILED: ${e.message}\n`);
    }
  };

  // 1. SERVICE FAILURE TEST
  await runTest('Gateway Resilience (Core-API Drop)', async () => {
    console.log('   -> Stopping core-api container...');
    execSync('docker compose stop core-api', { stdio: 'inherit' });
    
    // Check Gateway response
    try {
      await axios.get(`${GATEWAY_URL}/api/missions`);
      throw new Error('Gateway should have returned 502/504 but returned 200');
    } catch (e: any) {
      if (e.response?.status === 502 || e.response?.status === 504) {
        console.log(`   -> Gateway correctly returned ${e.response.status}`);
      } else {
        throw new Error(`Gateway returned unexpected status: ${e.response?.status}`);
      }
    }

    console.log('   -> Restarting core-api container...');
    execSync('docker compose start core-api', { stdio: 'inherit' });
    await new Promise(r => setTimeout(r, 5000)); // Wait for recovery
  });

  // 2. REDIS FAILURE TEST
  await runTest('Service Continuity (Redis Drop)', async () => {
    console.log('   -> Stopping redis container...');
    execSync('docker compose stop redis', { stdio: 'inherit' });

    // API should still work (degraded)
    const res = await axios.get(`${GATEWAY_URL}/health`); // Check health endpoint through gateway if possible
    // Actually direct check might be better
    const apiRes = await axios.get(`${CORE_API_URL}/health`);
    
    if (apiRes.data.checks.redis === false) {
        console.log('   -> Core-API correctly reported redis as UNHEALTHY');
    } else {
        throw new Error('Core-API failed to detect Redis failure');
    }

    console.log('   -> Restarting redis container...');
    execSync('docker compose start redis', { stdio: 'inherit' });
    await new Promise(r => setTimeout(r, 3000));
  });

  // 3. DATABASE FAILURE TEST
  await runTest('API Integrity (Database Drop)', async () => {
    console.log('   -> Stopping postgres container...');
    execSync('docker compose stop postgres', { stdio: 'inherit' });

    try {
      await axios.get(`${CORE_API_URL}/api/missions`); 
      throw new Error('API should have failed without DB');
    } catch (e: any) {
      if (e.response?.status === 500) {
        console.log('   -> API correctly returned 500 Internal Error');
        if (e.response.data.requestId) {
            console.log('   -> Traceability Check: requestId present in error payload.');
        }
      } else {
        throw new Error(`Unexpected status during DB outage: ${e.response?.status}`);
      }
    }

    console.log('   -> Restarting postgres container...');
    execSync('docker compose start postgres', { stdio: 'inherit' });
  });

  console.log('📊 CHAOS SUMMARY:');
  console.table(results);

  const allPassed = results.every(r => r.status === 'PASS');
  if (!allPassed) {
    process.exit(1);
  }
}

runChaosTests();
