import axios from 'axios';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { createServer as createCapabilityRuntime } from '../../apps/capability-runtime/src/server.js';
import { startServer as createLedger } from '../../apps/governance-ledger/src/server.js';
import { logger } from '@packages/observability';

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

import { serverConfig } from '@packages/config';

process.env.MOCK_DB = 'true';
process.env.MOCK_REDIS = 'true';
process.env.GOVERNANCE_LEDGER_URL = 'http://localhost:3105';

const JWT_SECRET = serverConfig.JWT_SECRET;

async function run() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║           ZTAN CAPABILITY RUNTIME CONTAINMENT TEST       ║');
  console.log('║           - Validating Bounded Execution Sandbox -       ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // Start servers
  createLedger().catch(console.error); // port 3105
  const runtimeApp = createCapabilityRuntime();
  const runtimeServer = runtimeApp.listen(3120, () => logger.info('Capability Runtime on 3120'));

  let passed = true;

  try {
    await wait(2000); // Wait for servers to spin up

    // Create temp files for read/write verification
    const testDir = path.resolve(process.cwd(), 'temp');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    const allowedReadFile = path.join(testDir, 'allowed-read.txt');
    const forbiddenReadFile = path.join(testDir, 'forbidden-read.txt');
    fs.writeFileSync(allowedReadFile, 'This is allowed data');
    fs.writeFileSync(forbiddenReadFile, 'This is confidential data');

    // ─── TEST 1: Filesystem Read Bounds Verification ───
    console.log('🧪 Test 1: Verifying Filesystem Read Bounds...');
    
    // Glob-friendly path replacement for windows
    const globAllowedPath = allowedReadFile.replace(/\\/g, '/');

    const tokenRead = jwt.sign({
      executionId: 'exec_read_test',
      capabilities: [`filesystem.read:${globAllowedPath}`]
    }, JWT_SECRET);

    const scriptRead = `
      const fs = require('fs');
      try {
        console.log('READ_ALLOWED: ' + fs.readFileSync('${globAllowedPath}', 'utf8'));
      } catch (err) {
        console.log('READ_ALLOWED_ERR: ' + err.message);
      }
      try {
        fs.readFileSync('${forbiddenReadFile.replace(/\\/g, '/')}', 'utf8');
        console.log('READ_FORBIDDEN_SUCCESS');
      } catch (err) {
        console.log('READ_FORBIDDEN_ERR: ' + err.message);
      }
    `;

    let res = await axios.post('http://localhost:3120/api/v1/runtime/execute', {
      executionId: 'exec_read_test',
      script: scriptRead,
      capabilityToken: tokenRead
    });

    console.log('   - Output:', res.data.output);
    console.log('   - Error:', res.data.error);
    console.log('   - Status:', res.data.status);
    console.log('   - Violations:', res.data.violations);
    if (!res.data.output.includes('READ_ALLOWED: This is allowed data')) {
      throw new Error(`Allowed file read failed (Status: ${res.data.status}, Error: ${res.data.error})`);
    }
    if (!res.data.output.includes('READ_FORBIDDEN_ERR: [CAPABILITY_VIOLATION]')) {
      throw new Error('Forbidden file read was not blocked');
    }
    console.log('✅ Read containment validated.');

    // ─── TEST 2: Filesystem Write Bounds Verification ───
    console.log('\n🧪 Test 2: Verifying Filesystem Write Bounds...');
    
    const allowedWriteFile = path.join(testDir, 'allowed-write.txt');
    const globAllowedWrite = allowedWriteFile.replace(/\\/g, '/');
    const forbiddenWriteFile = path.join(testDir, 'forbidden-write.txt');
    const globForbiddenWrite = forbiddenWriteFile.replace(/\\/g, '/');

    const tokenWrite = jwt.sign({
      executionId: 'exec_write_test',
      capabilities: [`filesystem.write:${globAllowedWrite}`]
    }, JWT_SECRET);

    const scriptWrite = `
      const fs = require('fs');
      try {
        fs.writeFileSync('${globAllowedWrite}', 'written');
        console.log('WRITE_ALLOWED_SUCCESS');
      } catch (err) {
        console.log('WRITE_ALLOWED_ERR: ' + err.message);
      }
      try {
        fs.writeFileSync('${globForbiddenWrite}', 'written');
        console.log('WRITE_FORBIDDEN_SUCCESS');
      } catch (err) {
        console.log('WRITE_FORBIDDEN_ERR: ' + err.message);
      }
    `;

    res = await axios.post('http://localhost:3120/api/v1/runtime/execute', {
      executionId: 'exec_write_test',
      script: scriptWrite,
      capabilityToken: tokenWrite
    });

    console.log('   - Output:', res.data.output);
    if (!res.data.output.includes('WRITE_ALLOWED_SUCCESS')) {
      throw new Error('Allowed file write failed');
    }
    if (!res.data.output.includes('WRITE_FORBIDDEN_ERR: [CAPABILITY_VIOLATION]')) {
      throw new Error('Forbidden file write was not blocked');
    }
    console.log('✅ Write containment validated.');

    // ─── TEST 3: Network Egress Restriction Verification ───
    console.log('\n🧪 Test 3: Verifying Network Egress Restrictions...');
    
    const tokenNet = jwt.sign({
      executionId: 'exec_net_test',
      capabilities: ['network.http:api.github.com']
    }, JWT_SECRET);

    // Test socket connection connect intercept
    const scriptNet = `
      const net = require('net');
      // Allowed outbound
      const clientAllowed = net.connect({ host: 'api.github.com', port: 443 }, () => {
        console.log('NET_ALLOWED_SUCCESS');
        clientAllowed.destroy();
      });
      clientAllowed.on('error', (e) => {
        console.log('NET_ALLOWED_ERR: ' + e.message);
      });
      // Forbidden outbound
      try {
        const clientForbidden = net.connect({ host: 'example.com', port: 80 });
        clientForbidden.on('error', (e) => {
          console.log('NET_FORBIDDEN_ERR: ' + e.message);
        });
      } catch (err) {
        console.log('NET_FORBIDDEN_CATCH: ' + err.message);
      }
    `;

    res = await axios.post('http://localhost:3120/api/v1/runtime/execute', {
      executionId: 'exec_net_test',
      script: scriptNet,
      capabilityToken: tokenNet
    });

    console.log('   - Output:', res.data.output);
    if (!res.data.output.includes('NET_ALLOWED_SUCCESS')) {
      throw new Error('Allowed network connection failed to connect');
    }
    if (!res.data.output.includes('NET_FORBIDDEN_CATCH: [CAPABILITY_VIOLATION]') && 
        !res.data.output.includes('NET_FORBIDDEN_ERR: [CAPABILITY_VIOLATION]')) {
      throw new Error('Forbidden network connection was not blocked');
    }
    console.log('✅ Network egress validated.');

    // ─── TEST 4: Subprocess Execution Verification ───
    console.log('\n🧪 Test 4: Verifying Subprocess Restrictions...');
    
    const tokenNoSub = jwt.sign({
      executionId: 'exec_nosub_test',
      capabilities: []
    }, JWT_SECRET);

    const scriptNoSub = `
      const cp = require('child_process');
      try {
        cp.execSync('node -v');
        console.log('SUBPROCESS_SUCCESS');
      } catch (err) {
        console.log('SUBPROCESS_ERR: ' + err.message);
      }
    `;

    res = await axios.post('http://localhost:3120/api/v1/runtime/execute', {
      executionId: 'exec_nosub_test',
      script: scriptNoSub,
      capabilityToken: tokenNoSub
    });

    console.log('   - Output:', res.data.output);
    if (res.data.output.includes('SUBPROCESS_SUCCESS')) {
      throw new Error('Subprocess execution succeeded without capability');
    }
    if (!res.data.output.includes('SUBPROCESS_ERR: [CAPABILITY_VIOLATION]')) {
      throw new Error('Subprocess execution attempt was not blocked');
    }
    console.log('✅ Subprocess restriction validated.');

    // ─── TEST 5: Watchdog Limits Verification (Timeout) ───
    console.log('\n🧪 Test 5: Verifying Timeout Resource Watchdog...');
    
    const tokenTimeout = jwt.sign({
      executionId: 'exec_timeout_test',
      capabilities: ['sandbox.timeout:2000'] // 2-second timeout
    }, JWT_SECRET);

    const scriptTimeout = `
      console.log('STARTING_INFINITE_LOOP');
      setInterval(() => {
        // Keeps process alive until watchdog terminates it
      }, 100);
    `;

    res = await axios.post('http://localhost:3120/api/v1/runtime/execute', {
      executionId: 'exec_timeout_test',
      script: scriptTimeout,
      capabilityToken: tokenTimeout
    });

    console.log('   - Output:', res.data.output);
    console.log('   - Status:', res.data.status);
    console.log('   - Violations:', res.data.violations);
    if (res.data.status !== 'terminated') {
      throw new Error(`Expected execution status 'terminated', got ${res.data.status}`);
    }
    if (!res.data.violations.some((v: string) => v.includes('timeout exceeded limit'))) {
      throw new Error('Timeout violation was not logged');
    }
    console.log('✅ Timeout resource watchdog validated.');

  } catch (err: any) {
    passed = false;
    console.error('❌ Integration test failed:', err.message);
  } finally {
    console.log('\n🛑 Shutting down test...');
    runtimeServer.close();
    if (passed) {
      console.log('\n🎉 ALL CAPABILITY RUNTIME CONTAINMENT TESTS PASSED.');
      process.exit(0);
    } else {
      console.log('\n❌ CAPABILITY RUNTIME CONTAINMENT TESTS FAILED.');
      process.exit(1);
    }
  }
}

run().catch(console.error);
