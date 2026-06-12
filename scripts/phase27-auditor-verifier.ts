import * as fs from 'fs';
import * as path from 'path';
import { AttestationVerifier } from '../packages/ztan-crypto/src/tpm/attestation-verifier.js';
import { TPMQuoteGenerator } from '../packages/runtime-core/src/tpm/quote-generator.js';

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const NC = '\x1b[0m'; // No Color

console.log(`${BLUE}====================================================${NC}`);
console.log(`${BLUE}   ZTAN PHASE 27 AUDITOR VERIFIER                   ${NC}`);
console.log(`${BLUE}====================================================${NC}\n`);

const cwd = process.cwd();

// Find the evidence file
let evidencePath = path.join(cwd, 'physical-attestation-evidence.json');
if (!fs.existsSync(evidencePath)) {
  evidencePath = path.join(cwd, 'DUE_DILIGENCE_PACKAGE', 'physical-attestation-evidence.json');
}

if (!fs.existsSync(evidencePath)) {
  console.log(`${RED}❌ Error: No physical-attestation-evidence.json found.${NC}`);
  console.log('   Please run the validation certifier first.');
  process.exit(1);
}

console.log(`Loading evidence file from: ${evidencePath}`);
const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));

console.log(`\n--- Evidence Metadata ---`);
console.log(`Timestamp:        ${evidence.timestamp}`);
console.log(`Attestation Mode:  ${evidence.attestationMode}`);
console.log(`Nonce:             ${evidence.nonce}`);
console.log(`Verified Status:   ${evidence.verified ? '✅ YES' : '❌ NO'}`);

if (evidence.pcrValues) {
  console.log(`PCR Values:`);
  console.log(JSON.stringify(evidence.pcrValues, null, 2));
}

if (evidence.qualifications && evidence.qualifications.length > 0) {
  console.log(`\nActive Qualifications:`);
  for (const qual of evidence.qualifications) {
    console.log(`  - ⚠️  ${qual}`);
  }
}

console.log(`\n--- Cryptographic Quote Audit ---`);
if (!evidence.quoteBase64 || !evidence.signatureBase64) {
  console.log(`${RED}❌ Error: Evidence is missing quote or signature buffer.${NC}`);
  process.exit(1);
}

const quote = {
  quoteBuffer: evidence.quoteBase64,
  signature: evidence.signatureBase64,
  pcrValues: evidence.pcrValues || {}
};

try {
  let hasAK = false;
  let verifier: AttestationVerifier;

  const akPubPath = path.join(cwd, 'ak.pub');
  if (fs.existsSync(akPubPath)) {
    console.log('Found ak.pub. Running full cryptographic signature check...');
    const akPub = fs.readFileSync(akPubPath, 'utf8');
    verifier = new AttestationVerifier(akPub);
    hasAK = true;
  } else {
    console.log(`${YELLOW}⚠️  Note: ak.pub PEM file not found in directory.${NC}`);
    console.log('   Cryptographic signature verification will be skipped, but parsing binary quote and checking PCR digests will proceed.');
    
    // Instantiate verifier with a dummy key just to get helper methods for decoding and digest computation
    const generator = new TPMQuoteGenerator();
    const akPub = generator.getPublicKey();
    verifier = new AttestationVerifier(akPub);
  }

  // Attempt to decode the quote structure to verify nonce and PCR digest
  console.log('Decoding TPM2B_ATTEST quote packet...');
  
  const expectedPcrValues = evidence.pcrValues || {};
  
  if (!hasAK) {
    const quoteBytes = Buffer.from(quote.quoteBuffer, 'base64');
    
    // Parse manually using the verifier's internal logic since signature check would fail without the correct key
    const parsed = (verifier as any).decodeTPM2BAttest(quoteBytes);
    console.log(`${GREEN}✓ Successfully decoded TPM magic and quote header.${NC}`);
    console.log(`✓ Nonce match check: Expected "${evidence.nonce}", parsed "${parsed.nonce}"`);
    
    if (parsed.nonce !== evidence.nonce) {
      throw new Error(`Nonce mismatch: Expected ${evidence.nonce}, got ${parsed.nonce}`);
    }
    
    const computedDigest = (verifier as any).computePcrDigest(quote.pcrValues);
    console.log(`✓ PCR Digest match check: Expected "${parsed.pcrDigest}", computed "${computedDigest}"`);
    
    if (parsed.pcrDigest !== computedDigest) {
      throw new Error('PCR digest mismatch');
    }
    console.log(`\n${GREEN}✅ PASS: TPM Quote binary structure, nonce, and PCR digest are consistent!${NC}`);
  } else {
    const isVerified = verifier.verifyQuote(quote, evidence.nonce, expectedPcrValues);
    if (isVerified) {
      console.log(`\n${GREEN}✅ PASS: TPM Cryptographic Quote is authentic and verified!${NC}`);
    } else {
      console.log(`\n${RED}❌ FAIL: TPM Quote verification failed.${NC}`);
      process.exit(1);
    }
  }
} catch (err: any) {
  console.log(`\n${RED}❌ Cryptographic audit failed: ${err.message}${NC}`);
  process.exit(1);
}
