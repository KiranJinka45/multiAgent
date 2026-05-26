import { sanitizeAndAttest } from '../packages/utils/src/governance-ledger.js';

function getJsonDepth(obj: any): number {
  if (obj === null || typeof obj !== 'object') return 0;
  let maxDepth = 0;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {maxDepth = Math.max(maxDepth, getJsonDepth(obj[key]));
    }
  }
  return maxDepth + 1;
}

function verifyJsonBracketDepth(str: string, maxDepth: number = 10): boolean {
  let depth = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '{' || char === '[') {
      depth++;
      if (depth > maxDepth) return false;
    } else if (char === '}' || char === ']') {
      depth = Math.max(0, depth - 1);
    }
  }
  return true;
}

async function main() {
  console.log('================================================================');
  console.log('🛡️  ZTAN ADVERSARIAL COMPRESSION-BOMB & RECURSION GUARD SUITE');
  console.log('================================================================\n');

  const results: any[] = [];

  const runTest = (name: string, payloadObj: any, maxAllowedDepth: number = 10) => {
    console.log(`\n⏳ Running Adversarial Guard: [${name}]`);
    
    let depth = 0;
    let rawStr = '';
    let isDeepBomb = false;
    let isSizeBomb = false;

    try {
      rawStr = JSON.stringify(payloadObj);
      console.log(`   - Payload String Size: ${rawStr.length} chars`);
      
      const startDepthTime = performance.now();
      depth = getJsonDepth(payloadObj);
      const endDepthTime = performance.now();
      
      console.log(`   - Calculated JSON depth: ${depth} levels (time: ${(endDepthTime - startDepthTime).toFixed(3)}ms)`);
      isDeepBomb = depth > maxAllowedDepth;
    } catch (e: any) {
      console.error(`   ❌ Failed to parse or measure depth:`, e.message || e);
    }

    const sizeLimit = 15 * 1024 * 1024; // 15MB limit
    isSizeBomb = rawStr.length > sizeLimit;

    const rejectedByGuards = isDeepBomb || isSizeBomb;
    console.log(`   - Deep Bomb Detected: ${isDeepBomb ? '🔴 YES' : '🟢 NO'}`);
    console.log(`   - Size Bomb Detected: ${isSizeBomb ? '🔴 YES' : '🟢 NO'}`);
    console.log(`   - Verdict: ${rejectedByGuards ? '🟢 BLOCKED (SAFE)' : '🔴 ACCEPTED (POTENTIAL VULNERABILITY)'}`);

    results.push({
      name,
      size: rawStr.length,
      depth,
      deepBomb: isDeepBomb,
      sizeBomb: isSizeBomb,
      blocked: rejectedByGuards
    });
  };

  // 1. Nominal payload (low depth, small size)
  runTest('Nominal Telemetry', {
    sequenceId: 1001,
    timestamp: new Date().toISOString(),
    type: 'TELEMETRY',
    payload: 'system_nominal_status',
    evidence: { verdict: 'VERIFIED' }
  });

  // 2. Deep recursive nesting payload (4 levels) - Nominal
  let nominalNested: any = { value: "leaf" };
  for (let i = 0; i < 4; i++) {
    nominalNested = { child: nominalNested };
  }
  runTest('Nominal 5-level Nested JSON', nominalNested);

  // 3. Deep recursive nesting payload (15 levels) - Deep Bomb
  let deepBomb15: any = { value: "leaf" };
  for (let i = 0; i < 15; i++) {
    deepBomb15 = { child: deepBomb15 };
  }
  runTest('Adversarial 16-level Nested JSON', deepBomb15);

  // 4. Extreme recursive nesting payload (50 levels) - Deep Bomb
  let deepBomb50: any = { value: "leaf" };
  for (let i = 0; i < 50; i++) {
    deepBomb50 = { child: deepBomb50 };
  }
  runTest('Adversarial 51-level Nested JSON', deepBomb50);

  // 5. Giant payload (exceeding 15MB) - Size Bomb
  const largeChar = 'A'.repeat(16 * 1024 * 1024); // 16MB string
  runTest('Adversarial 16MB Size Payload', {
    sequenceId: 9999,
    payload: largeChar
  });

  // 5.5. Streaming Depth Limiter tests
  console.log('\n================================================================');
  console.log('🛡️  STREAMING BRACKET DEPTH LIMITER TESTS');
  console.log('================================================================');

  const verifyBracketTest = (name: string, rawJsonStr: string, expectedResult: boolean) => {
    const start = performance.now();
    const passed = verifyJsonBracketDepth(rawJsonStr, 10);
    const end = performance.now();
    const resultOk = passed === expectedResult;
    console.log(`   [${name}] -> String length: ${rawJsonStr.length} chars, depth ok? ${passed ? '🟢 YES' : '🔴 NO (BLOCKED)'} (expected: ${expectedResult ? 'YES' : 'NO'}) -> ${resultOk ? '🟢 PASS' : '🔴 FAIL'} in ${(end - start).toFixed(3)}ms`);
    if (!resultOk) {
      throw new Error(`Streaming Bracket Depth check failed for scenario: ${name}`);
    }
  };

  // Safe nesting
  verifyBracketTest('Nominal Nested JSON', '{"a": {"b": {"c": [1, 2, {"d": "ok"}]}}}', true);

  // Stack-overflow bomb (11 levels nesting)
  let overflowStr = '{"a":';
  for (let i = 0; i < 11; i++) overflowStr += '{"x":';
  overflowStr += '"bomb"';
  for (let i = 0; i < 11; i++) overflowStr += '}';
  overflowStr += '}';
  verifyBracketTest('Stack-Overflow Bracket Bomb (11 levels)', overflowStr, false);

  // Complex valid structure
  verifyBracketTest('Complex Safe Nested JSON', '[{"a":1},{"b":[{"c":[{"d":{"e":1}}]}]}]', true);

  // 6. Test Unicode normalization parity
  console.log('\n================================================================');
  console.log('🔤 UNICODE NORMALIZATION PARITY CHECK');
  console.log('================================================================');
  
  const rawUnicode = 'E\u0301lasticity 💡 👨‍👩‍👧‍👦 RTL:\u202Ereversed\u202C'; // 'E' + combining acute accent
  const { sanitized, attestation, wasSanitized } = sanitizeAndAttest(rawUnicode);
  
  console.log(`Original String: "${rawUnicode}" (Length: ${rawUnicode.length})`);
  console.log(`Sanitized String: "${sanitized}" (Length: ${sanitized.length})`);
  console.log(`Unicode Normalization Applied: ${wasSanitized ? '🟢 YES' : '🔴 NO'}`);
  if (wasSanitized && attestation) {
    console.log(`Transformations Tracked: ${JSON.stringify(attestation.transformations)}`);
  }

  // 7. comparative verdict matrix
  console.log('\n================================================================');
  console.log('📊 BENCHMARK COMPARATIVE MATRIX');
  console.log('================================================================');
  console.table(results.map(r => ({
    'Test Scenario': r.name,
    'Serialized Size (bytes)': r.size,
    'JSON Depth': r.depth,
    'Deep Bomb?': r.deepBomb ? '🔴 YES' : '🟢 NO',
    'Size Bomb?': r.sizeBomb ? '🔴 YES' : '🟢 NO',
    'Ingestion Guard': r.blocked ? '🟢 BLOCKED (SAFE)' : '🔴 ALLOWED'
  })));
}

main();
