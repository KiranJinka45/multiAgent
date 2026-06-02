import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Set KMS key ARN env var to force HSMVault to initialize in KMS mode
process.env.KMS_SIGNING_KEY_ARN = 'arn:aws:kms:us-east-1:123456789012:key/test-signing-key';

// Mock behavior control for the KMS client
let mockKmsBehavior: 'NOMINAL' | 'THROTTLED' | 'TIMEOUT' = 'NOMINAL';
let lastCapturedKmsArgs: any = null;

// Define Mock Commands
class MockSignCommand {
  constructor(public input: any) {}
}
class MockVerifyCommand {
  constructor(public input: any) {}
}

// Define Mock Client
class MockKmsClient {
  public config = { region: 'us-east-1' };

  async send(command: any) {
    lastCapturedKmsArgs = command.input;

    if (mockKmsBehavior === 'THROTTLED') {
      const err = new Error('Rate exceeded');
      err.name = 'ThrottlingException';
      throw err;
    }

    if (mockKmsBehavior === 'TIMEOUT') {
      const err = new Error('Connection timed out');
      err.name = 'TimeoutError';
      throw err;
    }

    // Nominal Behavior
    if (command instanceof MockSignCommand) {
      return {
        Signature: Buffer.from('mock-kms-attestation-signature-blob')
      };
    }

    if (command instanceof MockVerifyCommand) {
      return {
        SignatureValid: true
      };
    }

    throw new Error(`Unknown mock command: ${command.constructor.name}`);
  }
}

// Inject require globally to support dynamic require calls in ESM context
const localRequire = createRequire(import.meta.url);
(global as any).require = (id: string) => {
  if (id === '@aws-sdk/client-kms') {
    return {
      KMSClient: MockKmsClient,
      SignCommand: MockSignCommand,
      VerifyCommand: MockVerifyCommand
    };
  }
  return localRequire(id);
};

async function main() {
  console.log('================================================================');
  console.log('🛡️ STARTING AWS KMS DEGRADATION & GRACEFUL FALLBACK DRILL');
  console.log('================================================================');

  // Import HSMVault after require override is active
  const { HSMVault, HSMErrorCode } = await import('../packages/utils/src/hsm-vault.js');

  const vault = new HSMVault(['operator-1', 'operator-2']);
  console.log(`[Prep] HSMVault initialized. Mode: ${vault.getMode()}`);

  if (vault.getMode() !== 'KMS') {
    throw new Error('HSMVault failed to initialize in KMS mode.');
  }

  const metrics = {
    nominalKmsSign: false,
    throttledKmsSignFallback: false,
    timeoutKmsSignFallback: false,
    finalVerdict: 'FAILED'
  };

  const payload = 'ztan-test-payload-12345';

  // -------------------------------------------------------------------------
  // Phase 1: Nominal KMS Operations
  // -------------------------------------------------------------------------
  console.log('\nPhase 1: Testing Nominal KMS Operations...');
  mockKmsBehavior = 'NOMINAL';

  const attestation1 = await vault.attest(payload);
  console.log(`   - Attestation signature: ${attestation1.signature}`);
  console.log(`   - Signature source:      ${lastCapturedKmsArgs ? 'AWS KMS Client' : 'Local Keypair'}`);

  if (attestation1.signature && lastCapturedKmsArgs) {
    console.log('   ✅ Nominal KMS signing verified.');
    metrics.nominalKmsSign = true;
  }

  // -------------------------------------------------------------------------
  // Phase 2: Rate Limiting (429 Throttling)
  // -------------------------------------------------------------------------
  console.log('\nPhase 2: Simulating KMS Throttling (429 ThrottlingException)...');
  mockKmsBehavior = 'THROTTLED';
  lastCapturedKmsArgs = null;

  // Intercept console.error to check if fallback warning is logged
  let errorLogged = false;
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    if (args[0]?.includes('[HSMVault] KMS signing failed')) {
      errorLogged = true;
    }
    originalConsoleError.apply(console, args);
  };

  try {
    const attestation2 = await vault.attest(payload);
    console.log(`   - Attestation signature: ${attestation2.signature}`);
    console.log(`   - Fallback error logged: ${errorLogged}`);
    
    if (attestation2.signature && errorLogged) {
      console.log('   ✅ Throttling fallback successful (Gracefully degraded to local keypair).');
      metrics.throttledKmsSignFallback = true;
    }
  } catch (err: any) {
    console.error(`   ❌ Error: Fallback failed: ${err.message}`);
  } finally {
    console.error = originalConsoleError;
  }

  // -------------------------------------------------------------------------
  // Phase 3: Timeout / Connection Failure
  // -------------------------------------------------------------------------
  console.log('\nPhase 3: Simulating KMS Timeout / Network Degradation...');
  mockKmsBehavior = 'TIMEOUT';
  lastCapturedKmsArgs = null;

  let timeoutLogged = false;
  console.error = (...args: any[]) => {
    if (args[0]?.includes('[HSMVault] KMS signing failed')) {
      timeoutLogged = true;
    }
    originalConsoleError.apply(console, args);
  };

  try {
    const attestation3 = await vault.attest(payload);
    console.log(`   - Attestation signature: ${attestation3.signature}`);
    console.log(`   - Fallback error logged: ${timeoutLogged}`);

    if (attestation3.signature && timeoutLogged) {
      console.log('   ✅ Timeout fallback successful (Gracefully degraded to local keypair).');
      metrics.timeoutKmsSignFallback = true;
    }
  } catch (err: any) {
    console.error(`   ❌ Error: Fallback failed: ${err.message}`);
  } finally {
    console.error = originalConsoleError;
  }

  // Compute final verdict
  if (
    metrics.nominalKmsSign &&
    metrics.throttledKmsSignFallback &&
    metrics.timeoutKmsSignFallback
  ) {
    metrics.finalVerdict = 'PASSED';
  }

  // Write campaign metrics file
  const reportPath = path.join(rootDir, 'telemetry-history', 'aws_kms_degradation_latest.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    metrics,
  }, null, 2), 'utf-8');

  console.log('================================================================');
  console.log(`🏁 DRILL FINISHED. Verdict: ${metrics.finalVerdict}`);
  console.log('================================================================');
  process.exit(metrics.finalVerdict === 'PASSED' ? 0 : 1);
}

main().catch(err => {
  console.error(`Fatal crash: ${err.message}`);
  process.exit(1);
});
