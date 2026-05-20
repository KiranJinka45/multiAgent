import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { canonicalizeJCS, validateDuplicateKeys } from './canonicalizer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PYTHON_FUZZER_BRIDGE = path.join(__dirname, 'run-differential-fuzz.py');

console.log('===========================================================');
console.log('    ZTAN Automated Cross-Runtime Differential Fuzzer        ');
console.log('===========================================================');

interface FuzzTestCase {
  id: string;
  category: string;
  action: 'validate_duplicate_keys' | 'canonicalize_jcs';
  payload: any; // Raw string for validate_duplicate_keys, JSON object/array/value for canonicalize_jcs
}

const testCases: FuzzTestCase[] = [];

// -----------------------------------------------------------------------------
// 1. Generate Fuzz Vectors targeting Edge-Case Vulnerability Spaces
// -----------------------------------------------------------------------------

// Category A: Duplicate Key Escaped Ambiguities & normalizations
const duplicateKeyEscapes = [
  { id: 'esc_hex_literal', raw: '{"\\u0061": 1, "a": 2}' },
  { id: 'esc_escaped_quote', raw: '{"a\\\\u0022": 1, "a\\"": 2}' },
  { id: 'esc_whitespace_tabs', raw: '{"\\tkey": 1, "key": 2}' },
  { id: 'esc_control_null', raw: '{"key\\u0000": 1, "key": 2}' },
  { id: 'esc_unicode_nfc_decomposed', raw: '{"a\\u0308": 1, "\\u00e4": 2}' },
  { id: 'esc_nested_dupes', raw: '{"nested": {"dup": 1, "dup": 2}}' },
  { id: 'esc_extreme_keys_limit', raw: '{' + Array.from({ length: 15 }, (_, i) => `"k${i}": ${i}`).join(',') + '}' },
];

for (const vector of duplicateKeyEscapes) {
  testCases.push({
    id: `dup_${vector.id}`,
    category: 'Duplicate Keys & Escapes',
    action: 'validate_duplicate_keys',
    payload: vector.raw
  });
}

// Category B: Float boundary limits
const floatBounds = [
  0.0,
  -0.0,
  1.0000000000000002, // JS float rounding border
  1e-20,
  1e+20,
  0.9850,
  45.0,
  -45.000,
  3.141592653589793,
];

for (let idx = 0; idx < floatBounds.length; idx++) {
  testCases.push({
    id: `float_bound_${idx}`,
    category: 'Float Limits & Normalization',
    action: 'canonicalize_jcs',
    payload: { payload: { rate: floatBounds[idx] } }
  });
}

// Category C: Non-finite numbers (should reject)
testCases.push({
  id: 'float_infinity',
  category: 'Non-Finite Floats',
  action: 'canonicalize_jcs',
  payload: { payload: { val: 'INFINITY_TRIGGER' } } // We'll inject Infinity dynamically
});

testCases.push({
  id: 'float_nan',
  category: 'Non-Finite Floats',
  action: 'canonicalize_jcs',
  payload: { payload: { val: 'NAN_TRIGGER' } } // We'll inject NaN dynamically
});

// Category D: Unicode glyph composition and surrogates
const unicodeGlyphs = [
  'a\u0308', // Decomposed ä
  '\u00e4', // Composed ä
  '💩', // Emoji surrogate pair
  '\uD83D', // Lone high surrogate
  '\uDE00', // Lone low surrogate
  '한국어', // Korean Hangul
  '👨‍👩‍👧‍👦', // Complex zero-width joiner family emoji
];

for (let idx = 0; idx < unicodeGlyphs.length; idx++) {
  testCases.push({
    id: `unicode_glyph_${idx}`,
    category: 'Unicode Composition & Surrogates',
    action: 'canonicalize_jcs',
    payload: { payload: { text: unicodeGlyphs[idx] } }
  });
}

// Category E: Resource Overflows (Depth, Strings, Bytes)
testCases.push({
  id: 'overflow_max_depth',
  category: 'Resource Boundaries',
  action: 'canonicalize_jcs',
  payload: 'DEPTH_OVERFLOW_TRIGGER'
});

testCases.push({
  id: 'overflow_max_string',
  category: 'Resource Boundaries',
  action: 'canonicalize_jcs',
  payload: { payload: { text: 'STRING_OVERFLOW_TRIGGER' } }
});

// Category F: Unquoted Identifiers & Non-Standard Literals (Duplicate Keys Scanner check)
const unquotedIdentifiers = [
  { id: 'infinity', raw: '{"rate": Infinity}' },
  { id: 'nan', raw: '{"rate": NaN}' },
  { id: 'undefined', raw: '{"rate": undefined}' },
  { id: 'malformed_word', raw: '{"rate": foo}' },
  { id: 'valid_exponent', raw: '{"rate": 1e5}' }, // Should PASS/CONVERGE perfectly
];

for (const vector of unquotedIdentifiers) {
  testCases.push({
    id: `unquoted_${vector.id}`,
    category: 'Unquoted Identifiers & Literals',
    action: 'validate_duplicate_keys',
    payload: vector.raw
  });
}

// -----------------------------------------------------------------------------
// 2. Differential Execution & Verification Orchestrator
// -----------------------------------------------------------------------------

let passedFuzzes = 0;
let totalFuzzes = 0;
let divergencesFound = 0;

interface DivergenceLog {
  id: string;
  category: string;
  payload: string;
  nodeResult: string;
  pyResult: string;
}
const divergenceLogs: DivergenceLog[] = [];

function runPythonBridge(action: string, payload: any): { status: 'OK' | 'ERROR'; value: string } {
  // Use a custom replacer to serialize Infinity and NaN safely as string placeholders to the Python subprocess
  const envelope = JSON.stringify({ action, payload }, (k, v) => {
    if (v === Infinity) return 'INFINITY_PLACEHOLDER';
    if (v === -Infinity) return 'NEG_INFINITY_PLACEHOLDER';
    if (typeof v === 'number' && Number.isNaN(v)) return 'NAN_PLACEHOLDER';
    return v;
  });

  const result = spawnSync('python', [PYTHON_FUZZER_BRIDGE], {
    input: envelope,
    encoding: 'utf8',
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
  });

  if (result.error) {
    return { status: 'ERROR', value: `Python execution failed: ${result.error.message}` };
  }

  const output = (result.stdout || '').trim();
  if (output.startsWith('OK:')) {
    return { status: 'OK', value: output.slice(3) };
  } else if (output === 'OK') {
    return { status: 'OK', value: 'OK' };
  } else if (output.startsWith('ERROR:')) {
    return { status: 'ERROR', value: output.slice(6) };
  } else {
    return { status: 'ERROR', value: `Unexpected bridge output: ${output}\nStderr: ${result.stderr}` };
  }
}

for (const tc of testCases) {
  totalFuzzes++;
  let payload = tc.payload;

  // Perform dynamic mutation injections for triggers
  if (payload === 'DEPTH_OVERFLOW_TRIGGER') {
    let deepObj: any = {};
    let curr = deepObj;
    for (let d = 0; d < 70; d++) {
      curr.nest = {};
      curr = curr.nest;
    }
    payload = { payload: deepObj };
  } else if (tc.id === 'float_infinity') {
    payload.payload.val = Infinity;
  } else if (tc.id === 'float_nan') {
    payload.payload.val = NaN;
  } else if (payload?.payload?.text === 'STRING_OVERFLOW_TRIGGER') {
    payload.payload.text = 'x'.repeat(65537);
  }

  // 1. Run Node.js / TS validation
  let nodeStatus: 'OK' | 'ERROR' = 'OK';
  let nodeValue = '';

  try {
    if (tc.action === 'validate_duplicate_keys') {
      validateDuplicateKeys(payload);
      nodeValue = 'OK';
    } else {
      nodeValue = canonicalizeJCS(payload);
    }
  } catch (e: any) {
    nodeStatus = 'ERROR';
    nodeValue = e.message;
  }

  // 2. Run Python bridge validation
  const pyResult = runPythonBridge(tc.action, payload);

  // 3. Compare outcomes for perfect parity alignment
  const isParityAligned = (nodeStatus === pyResult.status) && 
    (nodeStatus === 'OK' ? nodeValue === pyResult.value : true); // If failed, error message wording can differ slightly, but action must align

  if (isParityAligned) {
    console.log(`[PASS] [${tc.category}] Vector ${tc.id} converged perfectly.`);
    passedFuzzes++;
  } else {
    console.error(`[DIVERGENCE] [${tc.category}] Vector ${tc.id} diverged!`);
    console.error(`  Node.js Status: ${nodeStatus} | Value: ${nodeValue}`);
    console.error(`  Python  Status: ${pyResult.status} | Value: ${pyResult.value}`);
    divergencesFound++;
    divergenceLogs.push({
      id: tc.id,
      category: tc.category,
      payload: JSON.stringify(payload),
      nodeResult: `Status: ${nodeStatus} | Value: ${nodeValue}`,
      pyResult: `Status: ${pyResult.status} | Value: ${pyResult.value}`
    });
  }
}

// -----------------------------------------------------------------------------
// 3. Differential Fuzzing Outcome Summary Matrix
// -----------------------------------------------------------------------------
console.log('\n===========================================================');
console.log('    ZTAN Differential Fuzzing Execution Matrix             ');
console.log('===========================================================');
console.log(`Vectors Executed:  ${totalFuzzes}`);
console.log(`Vectors Converged: ${passedFuzzes}`);
console.log(`Divergences Found: ${divergencesFound}`);
console.log('===========================================================');

if (divergencesFound > 0) {
  console.error('\n❌ CRITICAL: Parser Divergences Found between Node.js and Python!');
  for (const log of divergenceLogs) {
    console.error(`\nVector: ${log.id} (${log.category})`);
    console.error(`  Input Payload: ${log.payload}`);
    console.error(`  Node.js Result: ${log.nodeResult}`);
    console.error(`  Python Result:  ${log.pyResult}`);
  }
  process.exit(1);
} else {
  console.log('\n✅ SUCCESS: All fuzzing vectors converged perfectly across both runtimes.');
}
