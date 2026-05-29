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
import { MerkleTree } from '@packages/supply-chain';

export async function run() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║        ZTAN SUPPLY CHAIN & REPLAY INTEGRATION TEST        ║');
  console.log('║        - Validating Stage 9 Supply Chain Integrity -     ║');
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

    // ─── CASE 1: Script execution & Deterministic Merkle Root ───
    console.log('🧪 Case 1: Executing agent script to create multiple artifacts...');

    const testDir = path.resolve(process.cwd(), 'temp');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    const executionId = `exec_supply_chain_${Date.now()}`;
    const token = jwt.sign({
      executionId,
      capabilities: [
        'filesystem.write:*',
        'sandbox.tier:tier0'
      ]
    }, JWT_SECRET);

    const script = `
      const fs = require('fs');
      fs.writeFileSync('art1.txt', 'provenance validation 1');
      fs.writeFileSync('art2.txt', 'provenance validation 2');
      console.log('Script execution completed.');
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

    console.log('✅ Sandbox execution completed and v2 attestation receipt created.');
    console.log('   - Schema Version:', attestation.schemaVersion);
    console.log('   - Artifact Merkle Root:', attestation.artifactMerkleRoot);
    console.log('   - Preload Hash:', attestation.environmentFingerprint?.preloadHash);
    console.log('   - SBOM Hash:', attestation.dependencyProvenance?.sbomHash);
    console.log('   - Merkle Manifest:', JSON.stringify(attestation.artifactMerkleManifest?.artifacts));

    if (attestation.schemaVersion !== 'ztan.attestation.v2') {
      throw new Error(`Expected schemaVersion to be 'ztan.attestation.v2', got '${attestation.schemaVersion}'`);
    }

    // Verify Merkle Root calculation manually in test to ensure mathematical correctness
    const expectedArt1Hash = crypto.createHash('sha256').update('provenance validation 1').digest('hex');
    const expectedArt2Hash = crypto.createHash('sha256').update('provenance validation 2').digest('hex');
    
    const manualArtifacts = [
      { path: 'art1.txt', sha256: expectedArt1Hash },
      { path: 'art2.txt', sha256: expectedArt2Hash }
    ];

    const manualMerkle = MerkleTree.buildMerkleTree(manualArtifacts);
    if (manualMerkle.rootHash !== attestation.artifactMerkleRoot) {
      throw new Error(`Merkle root mismatch! Expected ${manualMerkle.rootHash}, got ${attestation.artifactMerkleRoot}`);
    }
    console.log('✅ Merkle Tree root hash validated successfully in-test.');

    // ─── CASE 2: Stewardship Console Auditing ───
    console.log('\n🧪 Case 2: Auditing attestation via Stewardship Console...');
    const consoleRes = await axios.get(`http://localhost:3110/api/v1/stewardship/attestation/${executionId}`);

    console.log('   - Verification Status:', consoleRes.data.status);
    if (consoleRes.data.status !== 'VERIFIED') {
      throw new Error(`Stewardship Console failed to verify signature: status is ${consoleRes.data.status}`);
    }
    console.log('✅ Signature and supply chain details verified successfully as VERIFIED.');

    // ─── CASE 3: Preload Runtime / Supervisor Integrity Violation ───
    console.log('\n🧪 Case 3: Simulating a Preload / Supervisor Runtime Integrity Violation...');
    
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

    // Tamper with preloadHash inside the fingerprint
    (storedEvent as any).payload = JSON.stringify({
      ...originalPayload,
      environmentFingerprint: {
        ...originalPayload.environmentFingerprint,
        preloadHash: 'a'.repeat(64) // fake mismatched preload hash
      }
    });

    const suspectIntegrityRes = await axios.get(`http://localhost:3110/api/v1/stewardship/attestation/${executionId}`);
    console.log('   - Verification Status (Suspect Integrity):', suspectIntegrityRes.data.status);
    if (suspectIntegrityRes.data.status !== 'SUSPECT_INTEGRITY') {
      throw new Error(`Stewardship Console failed to catch preload integrity violation! Status: ${suspectIntegrityRes.data.status}`);
    }
    console.log('✅ Preload integrity mismatch successfully detected and flagged as SUSPECT_INTEGRITY.');

    // Restore original payload for subsequent tests
    (storedEvent as any).payload = JSON.stringify(originalPayload);

    // ─── CASE 4: Forensic Replay Package Retrieval ───
    console.log('\n🧪 Case 4: Retrieving forensic replay package...');
    const replayRes = await axios.get(`http://localhost:3110/api/v1/stewardship/replay/package/${executionId}`);

    const replayPkg = replayRes.data.replayPackage;
    if (!replayPkg) {
      throw new Error('Replay package not found in Stewardship Console response');
    }

    console.log('✅ Forensic replay package retrieved successfully.');
    console.log('   - Input Intent (first 100 chars):', replayPkg.inputIntent?.script?.trim().substring(0, 100) + '...');
    console.log('   - Capability Manifest:', replayPkg.capabilityManifest);
    console.log('   - Policy Snapshot:', JSON.stringify(replayPkg.policySnapshot));
    console.log('   - Environment Fingerprint Hash:', replayPkg.environmentFingerprint?.fingerprintHash);

    if (replayPkg.executionId !== executionId) {
      throw new Error(`Replay package executionId mismatch! Expected ${executionId}, got ${replayPkg.executionId}`);
    }
    if (!replayPkg.policySnapshot || replayPkg.policySnapshot.sandboxTier !== 'tier0') {
      throw new Error('Policy snapshot sandboxTier mismatch!');
    }
    console.log('✅ Replay package fields successfully validated.');

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
      console.log('\n🎉 ALL STAGE 9 SUPPLY CHAIN & REPLAY INTEGRATION TESTS PASSED.');
      process.exit(0);
    } else {
      console.log('\n❌ STAGE 9 SUPPLY CHAIN & REPLAY INTEGRATION TESTS FAILED.');
      process.exit(1);
    }
  }
}
