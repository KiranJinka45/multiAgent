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
import { ThresholdCrypto } from '@packages/ztan-crypto';
import { MerkleTree } from '@packages/supply-chain';

export async function run() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║        ZTAN HARDENED ISOLATION & REMOTE TRUST TEST       ║');
  console.log('║        - Validating Stage 10 Multi-Party Substrate -     ║');
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

    // ─── TEST 1: Tier 1 Process Jail Verification ───
    console.log('🧪 Test 1: Request execution under Tier 1 Hardened Process Isolation...');

    const testDir = path.resolve(process.cwd(), 'temp');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    const executionId = `exec_hardened_${Date.now()}`;
    const token = jwt.sign({
      executionId,
      capabilities: [
        'filesystem.write:*',
        'sandbox.tier:tier1' // 🔥 Request Hard Isolation
      ]
    }, JWT_SECRET);

    // Script attempts dynamic evaluation which is disallowed under Tier 1 node execution
    const script = `
      const fs = require('fs');
      fs.writeFileSync('art.txt', 'sandbox jail content');
      try {
        eval('1 + 1'); // Should be blocked by disallow-code-generation-from-strings
        fs.writeFileSync('eval_escaped.txt', 'escaped');
      } catch (e) {
        fs.writeFileSync('eval_blocked.txt', e.message);
      }
    `;

    const res = await axios.post('http://localhost:3120/api/v1/runtime/execute', {
      executionId,
      script,
      capabilityToken: token
    });

    console.log('   - Status:', res.data.status);
    console.log('   - Output:', res.data.output?.trim());

    if (res.data.status !== 'completed') {
      throw new Error(`Expected completed execution, got ${res.data.status}`);
    }

    const attestation = res.data.attestation;
    if (!attestation) {
      throw new Error('No attestation receipt returned in execution response');
    }

    console.log('✅ Hardened Sandbox execution completed.');
    console.log('   - Sandbox Tier:', attestation.sandboxTier);
    console.log('   - Merkle Root:', attestation.artifactMerkleRoot);

    if (attestation.sandboxTier !== 'tier1') {
      throw new Error(`Expected sandboxTier to be 'tier1', got '${attestation.sandboxTier}'`);
    }

    // Verify dynamic eval block wrote the expected error file
    const evalBlockedFile = attestation.artifactMerkleManifest?.artifacts?.find((a: any) => a.path === 'eval_blocked.txt');
    const evalEscapedFile = attestation.artifactMerkleManifest?.artifacts?.find((a: any) => a.path === 'eval_escaped.txt');

    if (evalEscapedFile) {
      throw new Error('Jail Escape! Dynamic eval successfully executed under Tier 1 hardened sandbox!');
    }
    if (!evalBlockedFile) {
      throw new Error('Expected eval_blocked.txt file to be written under blocked eval call');
    }
    console.log('✅ Hard Process isolation verified: Dynamic evaluation successfully blocked.');

    // ─── TEST 2: Detached Co-Signing & Aggregation ───
    console.log('\n🧪 Test 2: Verifying Detached Witness Co-signing & BLS Signature Aggregation...');
    
    // Check that we logged a sandbox.tier1.enforced audit event
    const enforcedEvent = await prisma.governanceEvent.findFirst({
      where: {
        correlationId: executionId,
        eventType: 'sandbox.tier1.enforced'
      }
    });
    if (!enforcedEvent) {
      throw new Error('Expected sandbox.tier1.enforced event in mock db');
    }
    console.log('✅ Audit event sandbox.tier1.enforced logged successfully in ledger.');

    // Query Stewardship Console for Aggregate Verification
    const consoleRes = await axios.get(`http://localhost:3110/api/v1/stewardship/attestation/${executionId}`);
    console.log('   - Verification Status:', consoleRes.data.status);
    if (consoleRes.data.status !== 'VERIFIED') {
      throw new Error(`Stewardship Console failed to verify Aggregate signature! Status: ${consoleRes.data.status}`);
    }
    console.log('✅ BLS aggregated co-signature verified successfully as VERIFIED.');

    // ─── TEST 3: Measured Boot/Image Tamper Audit ───
    console.log('\n🧪 Test 3: Simulating a Measured Boot Image Tamper Breach...');
    
    const storedEvent = await prisma.governanceEvent.findFirst({
      where: {
        correlationId: executionId,
        eventType: 'execution.attestation.created'
      }
    });

    if (!storedEvent) {
      throw new Error('Could not find attestation event in mock db');
    }

    const originalPayload = typeof storedEvent.payload === 'string'
      ? JSON.parse(storedEvent.payload as string)
      : storedEvent.payload;

    // Tamper with the measured boot sealed image hash in DB
    await prisma.governanceEvent.update({
      where: { eventId: storedEvent.eventId },
      data: {
        payload: JSON.stringify({
          ...originalPayload,
          environmentFingerprint: {
            ...originalPayload.environmentFingerprint,
            runtimeImageHash: 'a'.repeat(64) // fake mismatched image hash
          }
        })
      }
    });

    const suspectIntegrityRes = await axios.get(`http://localhost:3110/api/v1/stewardship/attestation/${executionId}`);
    console.log('   - Verification Status (Tampered Boot Image):', suspectIntegrityRes.data.status);
    if (suspectIntegrityRes.data.status !== 'SUSPECT_INTEGRITY') {
      throw new Error(`Stewardship Console failed to catch Measured Boot integrity violation! Status: ${suspectIntegrityRes.data.status}`);
    }
    console.log('✅ Measured Boot image mismatch successfully detected and flagged as SUSPECT_INTEGRITY.');

    // Restore original payload in DB
    await prisma.governanceEvent.update({
      where: { eventId: storedEvent.eventId },
      data: {
        payload: JSON.stringify(originalPayload)
      }
    });

    // ─── TEST 4: Hermetic Replay Analysis ───
    console.log('\n🧪 Test 4: Replaying forensic package & inspecting hermetic metadata...');
    const replayRes = await axios.get(`http://localhost:3110/api/v1/stewardship/replay/package/${executionId}`);

    const replayPkg = replayRes.data.replayPackage;
    if (!replayPkg) {
      throw new Error('Replay package not found in Stewardship Console response');
    }

    console.log('✅ Forensic replay package retrieved successfully.');
    console.log('   - Sealed Runtime Image Hash:', replayPkg.runtimeImageHash);
    console.log('   - Scrubbed Whitelist Environment Snapshot:', JSON.stringify(replayPkg.envSnapshot));
    console.log('   - System Syscall Policies:', replayPkg.syscallPolicy);
    console.log('   - Clock Timestamp Offset:', replayPkg.clockSnapshot?.timestamp);

    if (replayPkg.executionId !== executionId) {
      throw new Error(`Replay package executionId mismatch!`);
    }
    if (!replayPkg.dependencyProvenance || !replayPkg.dependencyProvenance.packageJsonFingerprint) {
      throw new Error('Replay package missing dependency lockfile tree manifests!');
    }
    if (!replayPkg.syscallPolicy.includes('dynamic_eval_blocked')) {
      throw new Error('Replay package missing syscall policy constraints!');
    }
    console.log('✅ Hermetic Replay constraints successfully verified.');

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
      console.log('\n🎉 ALL STAGE 10 HARDENED ISOLATION & REMOTE TRUST TESTS PASSED.');
      process.exit(0);
    } else {
      console.log('\n❌ STAGE 10 HARDENED ISOLATION & REMOTE TRUST TESTS FAILED.');
      process.exit(1);
    }
  }
}
