import { db } from '@packages/db';
import { GovernanceLedger } from '../../packages/utils/src/governance-ledger.js';
import { StartupAttestationService } from '../../packages/utils/src/startup-attestation.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import * as os from 'node:os';

function assert(condition: any, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  console.log('🏁 [TEST] Starting Phase 11A Tier P0: Root Sovereignty & Containment Integration Testing\n');

  // ==========================================
  // TEST 1: PostgreSQL Native Write Fencing & Immutability
  // ==========================================
  console.log('🛡️  [TEST 1] PostgreSQL Native Write Fencing & Immutability Audit...');

  // Setup: Clean slate
  const testPrefix = 'test-sovereignty-' + crypto.randomBytes(8).toString('hex');
  await db.ztanActiveLease.deleteMany({}).catch(() => {});

  // Scenario 1.1: Direct insertion must fail when no lease is registered
  try {
    console.log('   - Scenario 1.1: Attempting direct insert with no lease registered in the database...');
    await db.ztanLedgerBlock.create({
      data: {
        blockId: `${testPrefix}:1.1`,
        prevHash: '0x0',
        hash: '0x1.1hash',
        type: 'GOVERNANCE',
        payload: '{"scenario":"1.1"}',
        operator: 'regular-operator', 
        signature: 'sig',
        status: 'VERIFIED',
        epoch: '1'
      }
    });
    throw new Error('Scenario 1.1 FAILED: PostgreSQL accepted write when no active lease existed.');
  } catch (err: any) {
    const isFencingErr = err.message && (err.message.includes('[FENCING_ERROR]') || err.message.includes('ztan_epoch_fencing'));
    assert(isFencingErr, `Expected fencing error, got: ${err.message}`);
    console.log('   ✅ Scenario 1.1 PASSED: Database rejected write due to lack of active single-writer lease.');
  }

  // Scenario 1.2: Insert a lease, attempt write with unmatched session variable credentials
  const testLeaseId = 'singleton-lease-partition-0';
  await db.ztanActiveLease.create({
    data: {
      id: testLeaseId,
      generation: 42,
      owner_pid: 12345, // unmatched PID
      owner_host: 'rogue-host', // unmatched Host
      heartbeat: new Date()
    }
  });

  try {
    console.log('   - Scenario 1.2: Attempting write with mismatched session credentials...');
    // We execute prisma write. The postgres trigger should fail because we do not have matched session variables.
    await db.$transaction(async (tx: any) => {
      // Intentionally setting incorrect session credentials
      await tx.$executeRawUnsafe(`SET LOCAL ztan.active_writer_pid = '54321';`);
      await tx.$executeRawUnsafe(`SET LOCAL ztan.active_writer_host = 'different-host';`);

      await tx.ztanLedgerBlock.create({
        data: {
          blockId: `${testPrefix}:1.2`,
          prevHash: '0x0',
          hash: '0x1.2hash',
          type: 'GOVERNANCE',
          payload: '{"scenario":"1.2"}',
          operator: 'regular-operator',
          signature: 'sig',
          status: 'VERIFIED',
          epoch: '42'
        }
      });
    });
    throw new Error('Scenario 1.2 FAILED: Database accepted write with mismatched session credentials.');
  } catch (err: any) {
    const isFencingErr = err.message && err.message.includes('[FENCING_ERROR]');
    assert(isFencingErr, `Expected fencing error, got: ${err.message}`);
    console.log('   ✅ Scenario 1.2 PASSED: Database rejected write due to mismatched session credentials.');
  }

  // Scenario 1.3: Attempt write with MATCHED session credentials
  console.log('   - Scenario 1.3: Attempting write with matched session credentials...');
  await db.$transaction(async (tx: any) => {
    // Setting matched session credentials
    await tx.$executeRawUnsafe(`SET LOCAL ztan.active_writer_pid = '12345';`);
    await tx.$executeRawUnsafe(`SET LOCAL ztan.active_writer_host = 'rogue-host';`);

    await tx.ztanLedgerBlock.create({
      data: {
        blockId: `${testPrefix}:1.3`,
        prevHash: '0x0',
        hash: '0x1.3hash',
        type: 'GOVERNANCE',
        payload: '{"scenario":"1.3"}',
        operator: 'regular-operator',
        signature: 'sig',
        status: 'VERIFIED',
        epoch: '42'
      }
    });
  });
  console.log('   ✅ Scenario 1.3 PASSED: Database accepted write with matched credentials.');

  // Scenario 1.4: Immutable Updates
  try {
    console.log('   - Scenario 1.4: Attempting to update a ledger block...');
    await db.ztanLedgerBlock.update({
      where: { blockId: `${testPrefix}:1.3` },
      data: { type: 'REPLAY' }
    });
    throw new Error('Scenario 1.4 FAILED: Database allowed mutation/update of immutable ledger block.');
  } catch (err: any) {
    const isImmutabilityErr = err.message && (err.message.includes('Immutable Ledger Violation') || err.message.includes('ztan_enforce_immutability'));
    assert(isImmutabilityErr, `Expected immutability error, got: ${err.message}`);
    console.log('   ✅ Scenario 1.4 PASSED: Database prevented update of existing ledger block.');
  }

  // Scenario 1.5: Immutable Deletes
  try {
    console.log('   - Scenario 1.5: Attempting to delete a ledger block...');
    await db.ztanLedgerBlock.delete({
      where: { blockId: `${testPrefix}:1.3` }
    });
    throw new Error('Scenario 1.5 FAILED: Database allowed deletion of immutable ledger block.');
  } catch (err: any) {
    const isImmutabilityErr = err.message && (err.message.includes('Immutable Ledger Violation') || err.message.includes('ztan_enforce_immutability'));
    assert(isImmutabilityErr, `Expected immutability error, got: ${err.message}`);
    console.log('   ✅ Scenario 1.5 PASSED: Database prevented deletion of existing ledger block.');
  }

  // ==========================================
  // TEST 2: Cryptographic Signature Verification
  // ==========================================
  console.log('\n🔑 [TEST 2] Operator Cryptographic Signature Validation...');

  // Setup: Register a dummy operator key
  const dummyActor = 'test-auth-operator-dummy';
  await db.ztanRegisteredKey.deleteMany({ where: { actorId: dummyActor } }).catch(() => {});

  // Generate NIST P-256 Key pair for testing
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1'
  });
  const pubPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;
  await db.ztanRegisteredKey.create({
    data: {
      actorId: dummyActor,
      publicKey: pubPem
    }
  });

  // Scenario 2.1: Success under valid NIST P-256 signature
  console.log('   - Scenario 2.1: Verifying signature with valid registered operator P-256 key...');
  const payload = '{"data":"validated"}';
  const sign = crypto.createSign('SHA256');
  sign.update(payload);
  sign.end();
  const validSignature = sign.sign(privateKey).toString('base64');

  const isValid = GovernanceLedger.verifySignatureWithKey(payload, validSignature, pubPem);
  assert(isValid === true, 'Signature verification failed for valid generated key.');
  console.log('   ✅ Scenario 2.1 PASSED: Signature verification succeeded under valid conditions.');

  // Scenario 2.2: Failure under invalid signature
  console.log('   - Scenario 2.2: Verifying signature with invalid signature value...');
  const isInvalid = GovernanceLedger.verifySignatureWithKey(payload, 'invalid-signature-bytes-base64', pubPem);
  assert(isInvalid === false, 'Signature verification succeeded for invalid signature.');
  console.log('   ✅ Scenario 2.2 PASSED: Signature verification successfully rejected corrupted signature.');


  // ==========================================
  // TEST 3: Startup Attestation & Quarantine Isolation
  // ==========================================
  console.log('\n🔒 [TEST 3] Startup Attestation & Quarantine Isolation...');

  // Scenario 3.1: Normal configuration integrity check
  console.log('   - Scenario 3.1: Running attestation check on active .env...');
  const configPassed = StartupAttestationService.verifyConfigurationIntegrity();
  console.log(`     Config integrity result: ${configPassed}`);

  // Scenario 3.2: Environment Whitelist Audit with unledgered environment variables
  console.log('   - Scenario 3.2: Auditing environment variables under nominal state...');
  const envPassedNormal = StartupAttestationService.verifyEnvironmentVariables();
  assert(envPassedNormal === true, 'Environment variables validation failed under clean workspace conditions.');
  console.log('     Normal env variables verification: PASSED');

  console.log('   - Scenario 3.3: Injecting shadow/unchecksummed environment variable...');
  process.env.ZTAN_ROGUE_SHADOW_VARIABLE_ATTACK = 'malicious_agent_secret';
  // Note: We bypass ZTAN_ variables since ZTAN_ prefix is allowed by the whitelist in startup-attestation.ts
  // Let's inject a truly unledgered variable with a non-ZTAN name:
  process.env.SHADOW_WEAPON_SECRET_KEY = 'compromised_value';

  const envPassedCompromised = StartupAttestationService.verifyEnvironmentVariables();
  assert(envPassedCompromised === false, 'Attestation service accepted unledgered shadow environment variables.');
  console.log('     Compromised env variables verification: REJECTED (Shadow variables detected)');

  // Scenario 3.4: Node Quarantine State Transition
  console.log('   - Scenario 3.4: Checking GovernanceLedger.init() triggers QUARANTINED state...');
  
  // Call init to verify it transitions partitions into QUARANTINED state
  GovernanceLedger.init();
  
  const p0State = GovernanceLedger.getState(0);
  console.log(`     Partition 0 State: ${p0State}`);
  assert(p0State === 'QUARANTINED', `Expected QUARANTINED state, got ${p0State}`);
  
  // Cleanup the injected shadow variable
  delete process.env.SHADOW_WEAPON_SECRET_KEY;
  delete process.env.ZTAN_ROGUE_SHADOW_VARIABLE_ATTACK;

  console.log('   ✅ Scenario 3.4 PASSED: Governance ledger successfully quarantined node authority boundaries.');

  // Clean up database test fixtures
  await db.ztanLedgerBlock.deleteMany({ where: { blockId: { startsWith: 'test-sovereignty' } } }).catch(() => {});
  await db.ztanActiveLease.deleteMany({}).catch(() => {});
  await db.ztanRegisteredKey.deleteMany({ where: { actorId: dummyActor } }).catch(() => {});

  console.log('\n🏁 [TEST] COMPLETED: Phase 11A Tier P0 Root Sovereignty Certified.\n');
}

run().catch((err) => {
  console.error('❌ FAIL: Root Sovereignty test failed with error:');
  console.error(err);
  process.exit(1);
});
