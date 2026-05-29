import axios from 'axios';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createServer as createCapabilityRuntime } from '../../apps/capability-runtime/src/server.js';
import { startServer as createLedger } from '../../apps/governance-ledger/src/server.js';
import { startServer as createStewardshipConsole } from '../../apps/stewardship-console/src/server.js';
import { db as prisma } from '@packages/db';
import { logger } from '@packages/observability';
import { serverConfig } from '@packages/config';

export async function run() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║        ZTAN RUNTIME ATTESTATION INTEGRATION TEST         ║');
  console.log('║        - Validating Signed Execution Provenance -        ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const JWT_SECRET = serverConfig.JWT_SECRET;

  // Start servers
  createLedger().catch(console.error); // port 3105
  createStewardshipConsole().catch(console.error); // port 3110

  const runtimeApp = createCapabilityRuntime();
  const runtimeServer = runtimeApp.listen(3120, () => logger.info('Capability Runtime listening on 3120'));

  let passed = true;

  try {
    // Wait for servers to spin up
    await new Promise<void>((resolve) => setTimeout(resolve, 3000));

    // ─── TEST 1: Script execution with attestation ───
    console.log('🧪 Test 1: Request execution of a script that creates a file...');

    const testDir = path.resolve(process.cwd(), 'temp');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    const executionId = `exec_attestation_${Date.now()}`;
    const token = jwt.sign({
      executionId,
      capabilities: [
        'filesystem.write:*',
        'sandbox.tier:tier0'
      ]
    }, JWT_SECRET);

    const script = `
      const fs = require('fs');
      fs.writeFileSync('output.txt', 'provenance validation');
      console.log('Script execution completed.');
    `;

    const res = await axios.post('http://localhost:3120/api/v1/runtime/execute', {
      executionId,
      script,
      capabilityToken: token
    });

    console.log('   - Status:', res.data.status);
    console.log('   - Output:', res.data.output?.trim());
    console.log('   - Violations:', res.data.violations);

    if (res.data.status !== 'completed') {
      throw new Error(`Expected completed execution, got ${res.data.status}`);
    }

    const attestation = res.data.attestation;
    if (!attestation) {
      throw new Error('No attestation receipt returned in execution response');
    }

    console.log('✅ Sandbox execution completed and attestation receipt created.');
    console.log('   - Sandbox Tier:', attestation.sandboxTier);
    console.log('   - Output Artifacts:', attestation.outputArtifacts);
    console.log('   - Signature (first 40 chars):', attestation.signature?.substring(0, 40) + '...');

    if (attestation.sandboxTier !== 'tier0') {
      throw new Error(`Expected sandboxTier to be 'tier0', got '${attestation.sandboxTier}'`);
    }

    const outputArtifact = attestation.outputArtifacts?.find((a: any) => a.path === 'output.txt');
    if (!outputArtifact) {
      throw new Error('Expected output.txt to be listed in output artifacts');
    }

    const expectedHash = crypto.createHash('sha256').update('provenance validation').digest('hex');
    if (outputArtifact.sha256 !== expectedHash) {
      throw new Error(`Hash mismatch for output.txt: expected ${expectedHash}, got ${outputArtifact.sha256}`);
    }
    console.log('✅ File artifact hash verified successfully.');

    // ─── TEST 2: Stewardship Console attestation retrieval ───
    console.log('\n🧪 Test 2: Verifying attestation via Stewardship Console API...');
    const consoleRes = await axios.get(`http://localhost:3110/api/v1/stewardship/attestation/${executionId}`);

    console.log('   - Verification Status:', consoleRes.data.status);
    if (consoleRes.data.status !== 'VERIFIED') {
      throw new Error(`Stewardship Console failed to verify signature: status is ${consoleRes.data.status}`);
    }
    console.log('✅ Signature successfully verified as VERIFIED.');

    // ─── TEST 3: Tamper-evidence validation ───
    console.log('\n🧪 Test 3: Simulating a tamper attempt (altering the event payload)...');

    const storedEvent = await prisma.governanceEvent.findFirst({
      where: {
        correlationId: executionId,
        eventType: 'execution.attestation.created'
      }
    });

    if (!storedEvent) {
      throw new Error('Could not find the attestation event in mock db to modify');
    }

    // 3a. Corrupt the BLS signature
    console.log('   - Case A: Corrupting the BLS signature...');
    const originalPayload = typeof storedEvent.payload === 'string'
      ? JSON.parse(storedEvent.payload as string)
      : storedEvent.payload;

    (storedEvent as any).payload = JSON.stringify({
      ...originalPayload,
      signature: 'aabbccddeeff' + '0'.repeat(170)
    });

    const corruptedSigRes = await axios.get(`http://localhost:3110/api/v1/stewardship/attestation/${executionId}`);
    console.log('   - Verification Status (Corrupted Signature):', corruptedSigRes.data.status);
    if (corruptedSigRes.data.status !== 'INVALID') {
      throw new Error('Stewardship Console verified a corrupted signature!');
    }
    console.log('✅ Corrupted signature successfully rejected.');

    // 3b. Corrupt the artifact hash under original signature
    console.log('   - Case B: Corrupting the file checksum under original signature...');
    (storedEvent as any).payload = JSON.stringify({
      ...originalPayload,
      outputArtifacts: [
        {
          path: 'output.txt',
          sha256: 'a'.repeat(64)
        }
      ]
    });

    const corruptedContentRes = await axios.get(`http://localhost:3110/api/v1/stewardship/attestation/${executionId}`);
    console.log('   - Verification Status (Corrupted Content):', corruptedContentRes.data.status);
    if (corruptedContentRes.data.status !== 'INVALID') {
      throw new Error('Stewardship Console verified corrupted content!');
    }
    console.log('✅ Tampered content successfully detected and rejected.');

  } catch (err: any) {
    passed = false;
    console.error('❌ Integration test failed:', err.message);
    if (err.response) {
      console.error('   - Status code:', err.response.status);
      console.error('   - Response data:', JSON.stringify(err.response.data, null, 2));
    }
  } finally {
    console.log('\n🛑 Shutting down test...');
    runtimeServer.close();
    if (passed) {
      console.log('\n🎉 ALL RUNTIME ATTESTATION INTEGRATION TESTS PASSED.');
      process.exit(0);
    } else {
      console.log('\n❌ RUNTIME ATTESTATION INTEGRATION TESTS FAILED.');
      process.exit(1);
    }
  }
}
