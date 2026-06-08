import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalizeJCS, validateDuplicateKeys, computeZtanBlockHash } from './canonicalizer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_FILE = path.join(__dirname, 'conformance_fixtures.json');

console.log('===========================================================');
console.log('    ZTAN Deterministic Golden Interoperability Runner       ');
console.log('===========================================================');

let passedTests = 0;
let totalTests = 0;

function assertEqual(actual: string, expected: string, testName: string) {
  totalTests++;
  if (actual === expected) {
    console.log(`[PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`[FAIL] ${testName}`);
    console.error(`  Expected: ${expected}`);
    console.error(`  Actual:   ${actual}`);
  }
}

// 1. Run Frozen Interoperability Fixtures from JSON
try {
  if (!fs.existsSync(FIXTURES_FILE)) {
    throw new Error(`Conformance fixtures file not found at: ${FIXTURES_FILE}`);
  }
  
  const rawFixtures = fs.readFileSync(FIXTURES_FILE, 'utf8');
  const fixtures = JSON.parse(rawFixtures);
  
  console.log(`Loaded ${fixtures.length} frozen interoperability fixtures.`);
  
  for (const fixture of fixtures) {
    const { fixture_id, description, expected_action } = fixture;
    console.log(`\nExecuting Fixture [${fixture_id}]: ${description}`);
    
    if (expected_action === 'VALIDATE_SUCCESS') {
      const input = fixture.input;
      
      // Validate recursive canonicalization
      const actualJCS = canonicalizeJCS(input);
      assertEqual(actualJCS, fixture.expected_canonical_jcs, `${fixture_id} -> Canonical JCS Bytes`);
      
      // Validate hash calculation
      const actualHash = computeZtanBlockHash(input);
      assertEqual(actualHash, fixture.expected_sha256, `${fixture_id} -> SHA-256 Digest Parity`);
      
    } else if (expected_action === 'REJECT_DUPLICATE_KEYS') {
      totalTests++;
      const rawInput = fixture.raw_input_string;
      
      try {
        validateDuplicateKeys(rawInput);
        console.error(`[FAIL] ${fixture_id} -> Should have thrown duplicate key exception but passed.`);
      } catch (e: any) {
        console.log(`[PASS] ${fixture_id} -> Successfully caught duplicate key rejection: ${e.message}`);
        passedTests++;
      }
      
    } else if (expected_action === 'REJECT_NON_FINITE_FLOAT') {
      totalTests++;
      const input = fixture.input;
      
      // Inject Infinity dynamically
      input.payload.invalid_float = Infinity;
      try {
        canonicalizeJCS(input);
        console.error(`[FAIL] ${fixture_id} -> Should have rejected Infinity but completed successfully.`);
      } catch (e: any) {
        console.log(`[PASS] ${fixture_id} -> Successfully caught non-finite float (Infinity): ${e.message}`);
        passedTests++;
      }

      // Inject NaN dynamically
      totalTests++;
      input.payload.invalid_float = NaN;
      try {
        canonicalizeJCS(input);
        console.error(`[FAIL] ${fixture_id} -> Should have rejected NaN but completed successfully.`);
      } catch (e: any) {
        console.log(`[PASS] ${fixture_id} -> Successfully caught non-finite float (NaN): ${e.message}`);
        passedTests++;
      }

    } else if (expected_action === 'REJECT_SEQUENCE_OVERFLOW') {
      totalTests++;
      const input = fixture.input;
      
      try {
        computeZtanBlockHash(input);
        console.error(`[FAIL] ${fixture_id} -> Should have thrown sequence overflow exception but passed.`);
      } catch (e: any) {
        console.log(`[PASS] ${fixture_id} -> Successfully caught sequence safety overflow limit: ${e.message}`);
        passedTests++;
      }

    } else if (expected_action === 'REJECT_CIRCULAR_REFERENCE') {
      totalTests++;
      const input = fixture.input;
      
      // Create recursive cyclic self-reference dynamically
      const cyclicObj: any = {};
      cyclicObj.self = cyclicObj;
      input.payload = cyclicObj;
      
      try {
        canonicalizeJCS(input);
        console.error(`[FAIL] ${fixture_id} -> Should have thrown recursive stack overflow loop exception.`);
      } catch (e: any) {
        console.log(`[PASS] ${fixture_id} -> Successfully caught recursive circular structure loop: ${e.message}`);
        passedTests++;
      }
      
    } else if (expected_action === 'REJECT_MAX_DEPTH') {
      totalTests++;
      const input = fixture.input;
      
      // Build 70 levels deep nested structure dynamically
      const deepObj: any = {};
      let current = deepObj;
      for (let depth = 0; depth < 70; depth++) {
        current.nest = {};
        current = current.nest;
      }
      input.payload = deepObj;
      
      try {
        canonicalizeJCS(input);
        console.error(`[FAIL] ${fixture_id} -> Should have thrown max depth overflow exception.`);
      } catch (e: any) {
        console.log(`[PASS] ${fixture_id} -> Successfully caught max depth overflow: ${e.message}`);
        passedTests++;
      }
      
    } else if (expected_action === 'REJECT_MAX_STRING') {
      totalTests++;
      const input = fixture.input;
      
      // Build string longer than 65,536 chars
      const largeStr = 'a'.repeat(65537);
      input.payload.large_str = largeStr;
      
      try {
        canonicalizeJCS(input);
        console.error(`[FAIL] ${fixture_id} -> Should have thrown max string length exceeded exception.`);
      } catch (e: any) {
        console.log(`[PASS] ${fixture_id} -> Successfully caught string safety limit: ${e.message}`);
        passedTests++;
      }
      
    } else if (expected_action === 'REJECT_UNSUPPORTED_PROTOCOL') {
      totalTests++;
      const input = fixture.input;
      
      try {
        computeZtanBlockHash(input);
        console.error(`[FAIL] ${fixture_id} -> Should have thrown unsupported protocol version exception.`);
      } catch (e: any) {
        console.log(`[PASS] ${fixture_id} -> Successfully caught versioned protocol negotiation rejection: ${e.message}`);
        passedTests++;
      }
      
    } else if (expected_action === 'REJECT_UNSUPPORTED_HASH') {
      totalTests++;
      const input = fixture.input;
      
      try {
        computeZtanBlockHash(input);
        console.error(`[FAIL] ${fixture_id} -> Should have thrown unsupported hash algorithm exception.`);
      } catch (e: any) {
        console.log(`[PASS] ${fixture_id} -> Successfully caught hash algorithm negotiation rejection: ${e.message}`);
        passedTests++;
      }
    }
  }
} catch (error: any) {
  console.error('[ERROR] Failed during frozen fixtures execution:', error.message);
}

// 2. Extra In-Memory Parity Sanity Checks
console.log('\nRunning runtime sanity checks...');
try {
  // NFC Normalization Parity
  const decomposed = 'a\u0308'; 
  const composed = '\u00e4';
  const blockDecomposed = { name: decomposed };
  const blockComposed = { name: composed };
  assertEqual(
    canonicalizeJCS(blockDecomposed),
    canonicalizeJCS(blockComposed),
    'Runtime Unicode NFC normalizations yield exact identical bytes'
  );
  
  // Float Zero Truncation Parity
  const floatObj = { rate: 0.9850, size: 45.0 };
  const expectedJcs = '{"rate":0.985,"size":45}';
  assertEqual(
    canonicalizeJCS(floatObj),
    expectedJcs,
    'IEEE 754 Float Trailing Zero Truncation'
  );

  // Negative Zero Determinism Parity
  assertEqual(
    canonicalizeJCS({ scale: -0 }),
    '{"scale":0}',
    'JCS Negative Zero Normalization'
  );

  // Scientific Exponent Format Parity
  assertEqual(
    canonicalizeJCS({ bigNum: 1e+21 }),
    '{"bigNum":1e21}',
    'JCS Scientific Exponent + Sign Removal'
  );
} catch (e: any) {
  console.error('[ERROR] Runtime sanity checks failed:', e.message);
}

console.log('===========================================================');
console.log(`Interoperability Execution Completed: ${passedTests}/${totalTests} Passed.`);
console.log('===========================================================');
if (passedTests !== totalTests) {
  process.exit(1);
}
