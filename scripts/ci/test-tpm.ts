import { TPMQuoteGenerator } from '../../packages/runtime-core/src/tpm/quote-generator';
import { AttestationVerifier } from '../../packages/ztan-crypto/src/tpm/attestation-verifier';
import * as crypto from 'crypto';

console.log('--- Testing Wave 2 TPM Attestation Simulator ---');

// 1. Initialize Simulator
const generator = new TPMQuoteGenerator();
const akPub = generator.getPublicKey();

// 2. Initialize Verifier with the known AK public key
const verifier = new AttestationVerifier(akPub);

// Establish the expected good baseline for PCR 0, 7, 10
const expectedPcrValues = {
  0: crypto.createHash('sha256').update('fw-baseline').digest('hex'),
  7: crypto.createHash('sha256').update('secure-boot-keys').digest('hex'),
  10: crypto.createHash('sha256').update('ima-measurement-list').digest('hex')
};

// 3. Generate Nonce
const nonce = crypto.randomBytes(32).toString('hex');
console.log(`[Challenge] Nonce: ${nonce}`);

// 4. Request Quote
console.log('[HostDaemon] Generating Quote over PCR 0, 7, 10...');
const quote = generator.generateQuote(nonce);

// 5. Verify Quote
console.log('[Verifier] Validating Quote...');
const isSuccess = verifier.verifyQuote(quote, nonce, expectedPcrValues);
if (isSuccess) {
  console.log('✅ Quote Verification Succeeded!');
} else {
  console.log('❌ Quote Verification Failed!');
  process.exit(1);
}

// 6. Test Tampering
console.log('\n--- Testing PCR Tamper Detection ---');
generator.injectPcrTampering(10);
const tamperedQuote = generator.generateQuote(nonce);
console.log('[Verifier] Validating Tampered Quote...');
const isFailExpected = verifier.verifyQuote(tamperedQuote, nonce, expectedPcrValues);

if (!isFailExpected) {
  console.log('✅ Tamper Detection Succeeded! Verifier rejected bad state.');
} else {
  console.log('❌ Tamper Detection Failed! Verifier accepted tampered state.');
  process.exit(1);
}
