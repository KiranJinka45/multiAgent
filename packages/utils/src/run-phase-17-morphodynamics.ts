import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ReplayExecutionContract } from './dvk/harness/index.js';
import { 
  ReplayQueueScheduler, 
  ReplayPersistenceManager, 
  SemanticObjectProjector, 
  RoundtripSemanticStabilizer 
} from './dvk/harness/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('========================================================================');
console.log('   ZTAN Harness - Phase 17 Roundtrip Semantic & Collapse Observatories  ');
console.log('========================================================================');

const targetDbPath = path.join(process.cwd(), 'replay_db.json');
ReplayPersistenceManager.setDbPath(targetDbPath);

// Clear previous DB
ReplayPersistenceManager.clear();
console.log(`[+] Cleared database file 'replay_db.json'`);

// -----------------------------------------------------------------------------
// 1. Direct unit checks for Roundtrip Semantic Stabilizer
// -----------------------------------------------------------------------------
console.log('\n[+] Running Direct Unit Validation on RoundtripSemanticStabilizer...');

// A. Trailing zeros in floats
const floatRaw = '{"float_val": 4.0}';
const floatStable = RoundtripSemanticStabilizer.stabilizeRoundtrip(floatRaw);
console.log(`  * Float trailing zero: Raw="${floatRaw}" -> Stable="${floatStable}"`);
if (floatStable !== '{"float_val":4}') {
  throw new Error('Float trailing zero stabilization failed.');
}

// B. Scientific notation rewriting
const sciRaw = '{"sci_val": 1.0e2}';
const sciStable = RoundtripSemanticStabilizer.stabilizeRoundtrip(sciRaw);
console.log(`  * Scientific notation: Raw="${sciRaw}" -> Stable="${sciStable}"`);
if (sciStable !== '{"sci_val":100}') {
  throw new Error('Scientific notation stabilization failed.');
}

// C. ISO Datetime Canonicalization
const dateRaw = '{"time": "2026-05-20T19:27:41+05:30"}';
const dateStable = RoundtripSemanticStabilizer.stabilizeRoundtrip(dateRaw);
console.log(`  * ISO Date canonicalization: Raw="${dateRaw}" -> Stable="${dateStable}"`);
if (!dateStable.includes('2026-05-20T13:57:41.000Z')) {
  throw new Error('ISO Datetime canonicalization failed.');
}

// D. Escaped slash normalization
const slashRaw = '{"url": "https:\\/\\/example.com\\/path"}';
const slashStable = RoundtripSemanticStabilizer.stabilizeRoundtrip(slashRaw);
console.log(`  * Escaped slash: Raw="${slashRaw}" -> Stable="${slashStable}"`);
if (slashStable !== '{"url":"https://example.com/path"}') {
  throw new Error('Escaped slash normalization failed.');
}

// E. Unpaired surrogate repair
const surrogateRaw = '{"surrogate": "bad\\uD800char"}';
const surrogateStable = RoundtripSemanticStabilizer.stabilizeRoundtrip(surrogateRaw);
console.log(`  * Unpaired surrogate: Raw="${surrogateRaw}" -> Stable="${surrogateStable}"`);
if (surrogateStable !== '{"surrogate":"bad\uFFFDchar"}') {
  throw new Error('Unpaired surrogate repair failed.');
}

// F. Sparse array normalization
const sparseRaw = '{"arr": [1, null, 3]}';
const sparseStable = RoundtripSemanticStabilizer.stabilizeRoundtrip(sparseRaw);
console.log(`  * Sparse array: Raw="${sparseRaw}" -> Stable="${sparseStable}"`);
if (sparseStable !== '{"arr":[1,null,3]}') {
  throw new Error('Sparse array stabilization failed.');
}

// G. Object property sorting
const sortRaw = '{"z": 100, "a": 50, "m": 75}';
const sortStable = RoundtripSemanticStabilizer.stabilizeRoundtrip(sortRaw);
console.log(`  * Key ordering: Raw="${sortRaw}" -> Stable="${sortStable}"`);
if (sortStable !== '{"a":50,"m":75,"z":100}') {
  throw new Error('Object property key sorting failed.');
}

console.log('[+] Direct RoundtripSemanticStabilizer checks: ALL PASS');

// -----------------------------------------------------------------------------
// 2. Direct unit checks for Ecosystem Profiles & Alias Fallbacks
// -----------------------------------------------------------------------------
console.log('\n[+] Running Direct Unit Validation on Ecosystem Profile Aliasing...');

// A. canonical_order_strict: strict order and uniqueness
const orderTokensA = [
  { token_type: 'LEFT_BRACE', value: '{', start: 0, end: 1 },
  { token_type: 'STRING', value: 'a', start: 1, end: 4 },
  { token_type: 'COLON', value: ':', start: 4, end: 5 },
  { token_type: 'LITERAL', value: '1', start: 5, end: 6 },
  { token_type: 'COMMA', value: ',', start: 6, end: 7 },
  { token_type: 'STRING', value: 'b', start: 7, end: 10 },
  { token_type: 'COLON', value: ':', start: 10, end: 11 },
  { token_type: 'LITERAL', value: '2', start: 11, end: 12 },
  { token_type: 'RIGHT_BRACE', value: '}', start: 12, end: 13 }
];
const orderTokensB = [
  { token_type: 'LEFT_BRACE', value: '{', start: 0, end: 1 },
  { token_type: 'STRING', value: 'b', start: 1, end: 4 },
  { token_type: 'COLON', value: ':', start: 4, end: 5 },
  { token_type: 'LITERAL', value: '2', start: 5, end: 6 },
  { token_type: 'COMMA', value: ',', start: 6, end: 7 },
  { token_type: 'STRING', value: 'a', start: 7, end: 10 },
  { token_type: 'COLON', value: ':', start: 10, end: 11 },
  { token_type: 'LITERAL', value: '1', start: 11, end: 12 },
  { token_type: 'RIGHT_BRACE', value: '}', start: 12, end: 13 }
];

const astA = SemanticObjectProjector.buildAST(orderTokensA, 'canonical_order_strict');
const astB = SemanticObjectProjector.buildAST(orderTokensB, 'canonical_order_strict');

// Under canonical_order_strict, comparing different key order must throw
try {
  SemanticObjectProjector.compareASTs(astA, astB, '', 'canonical_order_strict');
  throw new Error('canonical_order_strict failed to enforce strict ordering.');
} catch (e: any) {
  if (!e.message.includes('[CANONICAL_ORDER_STRICT] Key-order mismatch')) {
    throw new Error(`canonical_order_strict threw unexpected error: ${e.message}`);
  }
  console.log('  * canonical_order_strict enforces strict key-ordering: PASS');
}

// Under deprecated rfc8259_strict alias fallback, comparing different key order must also throw similarly
try {
  SemanticObjectProjector.compareASTs(astA, astB, '', 'rfc8259_strict');
  throw new Error('rfc8259_strict alias failed to enforce strict ordering.');
} catch (e: any) {
  if (!e.message.includes('[CANONICAL_ORDER_STRICT] Key-order mismatch')) {
    throw new Error(`rfc8259_strict alias threw unexpected error: ${e.message}`);
  }
  console.log('  * rfc8259_strict alias maps correctly to canonical_order_strict: PASS');
}

// Duplicate keys throw in both profiles
const dupTokens = [
  { token_type: 'LEFT_BRACE', value: '{', start: 0, end: 1 },
  { token_type: 'STRING', value: 'x', start: 1, end: 4 },
  { token_type: 'COLON', value: ':', start: 4, end: 5 },
  { token_type: 'LITERAL', value: '1', start: 5, end: 6 },
  { token_type: 'COMMA', value: ',', start: 6, end: 7 },
  { token_type: 'STRING', value: 'x', start: 7, end: 10 },
  { token_type: 'COLON', value: ':', start: 10, end: 11 },
  { token_type: 'LITERAL', value: '2', start: 11, end: 12 },
  { token_type: 'RIGHT_BRACE', value: '}', start: 12, end: 13 }
];

try {
  SemanticObjectProjector.buildAST(dupTokens, 'canonical_order_strict');
  throw new Error('canonical_order_strict failed to throw on duplicate key.');
} catch (e: any) {
  if (!e.message.includes('[CANONICAL_ORDER_STRICT] Duplicate key detected')) {
    throw new Error(`canonical_order_strict duplicate check threw unexpected error: ${e.message}`);
  }
  console.log('  * canonical_order_strict throws on duplicates: PASS');
}

try {
  SemanticObjectProjector.buildAST(dupTokens, 'rfc8259_strict');
  throw new Error('rfc8259_strict alias failed to throw on duplicate key.');
} catch (e: any) {
  if (!e.message.includes('[CANONICAL_ORDER_STRICT] Duplicate key detected')) {
    throw new Error(`rfc8259_strict duplicate check threw unexpected error: ${e.message}`);
  }
  console.log('  * rfc8259_strict alias duplicate check maps correctly: PASS');
}

console.log('[+] Direct Ecosystem Profile checks: ALL PASS');

// -----------------------------------------------------------------------------
// 3. Direct unit checks for Advanced Unicode Forensics Scanner
// -----------------------------------------------------------------------------
console.log('\n[+] Running Direct Unit Validation on Advanced Unicode Forensics Scanner...');

// A. Variation selectors
const vsForensics = SemanticObjectProjector.scanUnicodeForensics('❤️');
console.log(`  * Variation Selector (emoji style): Selector=${vsForensics.hasVariationSelector}`);
if (!vsForensics.hasVariationSelector) {
  throw new Error('Variation Selector detection failed.');
}

// B. Regional Indicator Pairs (Flag)
const riForensics = SemanticObjectProjector.scanUnicodeForensics('🇺🇸');
console.log(`  * Regional Indicator Pair (flag): Indicators=${riForensics.hasRegionalIndicator}`);
if (!riForensics.hasRegionalIndicator) {
  throw new Error('Regional Indicator Pair detection failed.');
}

// C. Invisible Tag Characters
const tagForensics = SemanticObjectProjector.scanUnicodeForensics('Hello\u{E0020}World');
console.log(`  * Invisible Tag Characters: Tag=${tagForensics.hasTagCharacters}`);
if (!tagForensics.hasTagCharacters) {
  throw new Error('Tag character detection failed.');
}

// D. Combining Marks Stack
const combineForensics = SemanticObjectProjector.scanUnicodeForensics('o\u0308');
console.log(`  * Combining Marks stack: Combining=${combineForensics.hasCombiningMarks}`);
if (!combineForensics.hasCombiningMarks) {
  throw new Error('Combining marks detection failed.');
}

// E. Invisible zero-width separators
const separatorForensics = SemanticObjectProjector.scanUnicodeForensics('a\u200Bb');
console.log(`  * Invisible zero-width separator: Separator=${separatorForensics.hasInvisibleSeparators}`);
if (!separatorForensics.hasInvisibleSeparators) {
  throw new Error('Invisible separator detection failed.');
}

// F. Script Mixing Density Scoring
const mixedScriptStr = 'аbс'; // Cyrillic а, Latin b, Cyrillic с
const mixedForensics = SemanticObjectProjector.scanUnicodeForensics(mixedScriptStr);
console.log(`  * Script-mixing Density: Density=${mixedForensics.scriptMixingDensity.toFixed(4)}`);
if (mixedForensics.scriptMixingDensity === 0) {
  throw new Error('Script mixing density scoring failed.');
}

// G. Grapheme Segmentation counts vs Code Point count
const graphemeStr = '👨‍👩‍👧‍👦🇺🇸';
const graphemeForensics = SemanticObjectProjector.scanUnicodeForensics(graphemeStr);
console.log(`  * Grapheme count segmentation vs Code Points: Graphemes=${graphemeForensics.graphemeCount}, CodePoints=${graphemeForensics.codePointCount}`);
if (graphemeForensics.graphemeCount !== 2) {
  throw new Error('Grapheme cluster segmentation count failed.');
}

console.log('[+] Direct Advanced Unicode Forensics checks: ALL PASS');

// -----------------------------------------------------------------------------
// 4. Setup campaign payloads & scheduling
// -----------------------------------------------------------------------------
const testPayloads = [
  {
    name: 'Floats & Scientific notations',
    payload: '{"integer": 4, "float": 4.0, "scientific": 1.0e2, "timestamp": "2026-05-20T19:27:41+05:30"}',
    intended_pathology: 'float_canonicalization'
  },
  {
    name: 'Advanced Unicode elements',
    payload: '{"flag": "🇺🇸", "symbol": "❤️", "hidden": "payload\\u{E0020}tag", "accents": "o\\u0308", "zero_space": "a\\u200Bb"}',
    intended_pathology: 'unicode_elements'
  },
  {
    name: 'Unpaired surrogates & slash escape',
    payload: '{"path": "https:\\/\\/example.com\\/dvk", "damaged_string": "surrogate\\uD800here"}',
    intended_pathology: 'surrogates_slashes'
  },
  {
    name: 'Sparse array & unordered layout',
    payload: '{"z": 9, "a": 1, "sparse_list": [10, null, 30]}',
    intended_pathology: 'sparse_and_unordered'
  }
];

async function run() {
  console.log(`\n[+] Initializing ReplayQueueScheduler for Concurrency Campaign`);
  const scheduler = new ReplayQueueScheduler(2); // pool limit = 2 for scheduling bursts

  const tasksCount = 30;
  console.log(`[+] Queueing ${tasksCount} compatibility & morphodynamics tasks...`);

  const promises = [];
  let completedCount = 0;
  let timeoutsCount = 0;
  let crashesCount = 0;

  const campaignResults: any[] = [];

  for (let i = 0; i < tasksCount; i++) {
    const payloadInfo = testPayloads[i % testPayloads.length];
    
    // Choose ecosystem profile round robin
    const profiles: ('canonical_order_strict' | 'rfc8259_strict' | 'ecma262' | 'legacy_first_win' | 'duplicate_error')[] = [
      'ecma262',
      'legacy_first_win',
      'duplicate_error',
      'canonical_order_strict',
      'rfc8259_strict'
    ];
    const targetProfile = profiles[i % profiles.length];

    let entropyProfile: any = {};
    let flushInterval = 64;

    // Phase 17 Sabotage Injection (alternating burst loads to map hysteresis)
    if (i < 5) {
      // Stable calibration phase
      entropyProfile = {
        async_chunk_jitter: false,
        stdout_fragmentation: false
      };
    } else if (i < 18) {
      // High-frequency interference burst -> builds up queue backlog
      entropyProfile = {
        async_chunk_jitter: true,
        jitter_intensity: 2.5,
        stdout_fragmentation: true,
        backpressure_intensity: 2.0,
        scheduler_contention: true
      };
      flushInterval = 16;
    } else if (i < 25) {
      // Extremal contention -> triggers Regime-Shift and possible warnings
      entropyProfile = {
        async_chunk_jitter: true,
        jitter_intensity: 4.5,
        stdout_fragmentation: true,
        backpressure_intensity: 4.5,
        scheduler_contention: true,
        stderr_flood_intensity: 4.0
      };
      flushInterval = 8;
    } else {
      // De-escalation & recovery phase
      entropyProfile = {
        async_chunk_jitter: false,
        stdout_fragmentation: false
      };
    }

    const contract: ReplayExecutionContract = {
      corpus_id: `conformance_p17_t${i}_${payloadInfo.intended_pathology}`,
      deterministic_seed: `phase17_t${i}`,
      runtime_pair: { primary: 'typescript', secondary: 'rust' },
      chunk_strategy: 'boundary_targeted',
      fragmentation_profile: { strategy: 'boundary_targeted' },
      snapshot_schema_version: 'v1.0',
      entropy_profile: entropyProfile,
      topology_flush_interval: flushInterval,
      ecosystem_profile: targetProfile
    };

    const taskPromise = scheduler.schedule(contract, payloadInfo.payload).then(
      async (profile) => {
        completedCount++;
        const primary = profile.primary_artifacts;
        const secondary = profile.secondary_artifacts;

        if (primary.infrastructure_failure === 'TIMEOUT' || secondary.infrastructure_failure === 'TIMEOUT') timeoutsCount++;
        if (primary.infrastructure_failure === 'PROCESS_CRASH' || secondary.infrastructure_failure === 'PROCESS_CRASH') crashesCount++;

        const currentPhase = scheduler.classifyCollapsePhase(timeoutsCount, crashesCount);
        const queueDelay = scheduler.queueDelays[scheduler.queueDelays.length - 1] || 0;
        const prediction = scheduler.predictDivergenceOnset();
        const regime = scheduler.detectRegimeShift();

        const persistOptions = {
          compress: true,
          batchThreshold: 1,
          retentionCeiling: 100,
          queueDelayMs: queueDelay,
          pressureCeilingMs: 1500, // Trigger shedded/sampled under concurrency
          enableAdaptiveShedding: true,
          enableTopologySampling: true,
        };

        // Save telemetry profile (incorporating frequency-weighted confidence logic)
        ReplayPersistenceManager.saveProfile(profile, persistOptions);

        const savedProfiles = ReplayPersistenceManager.loadAllProfiles();
        const latestSaved = savedProfiles[savedProfiles.length - 1];
        const persistenceMetrics = latestSaved?.persistence_metrics || {};

        let astEqual = false;
        let roundtripParity = false;
        let tsASTType = 'N/A';
        let rustASTType = 'N/A';
        let astDetails = '';

        if (primary.final_result === 'accept' && secondary.final_result === 'accept') {
          try {
            const tsTokens = SemanticObjectProjector.extractTSTokens(primary.snapshots);
            const rustTokens = SemanticObjectProjector.extractRustTokens(secondary.snapshots, payloadInfo.payload);
            if (tsTokens.length > 0 && rustTokens.length > 0) {
              const tsAST = SemanticObjectProjector.buildAST(tsTokens, targetProfile);
              const rustAST = SemanticObjectProjector.buildAST(rustTokens, targetProfile);
              tsASTType = tsAST.type;
              rustASTType = rustAST.type;
              const compareRes = SemanticObjectProjector.compareASTs(tsAST, rustAST, '', targetProfile);
              astEqual = compareRes.isEqual;
              astDetails = compareRes.details || 'ASTs match perfectly.';

              // Roundtrip Parity check utilizing stabilizer
              const tsReconstruct = tsTokens.map(t => t.value).join('');
              const rustReconstruct = rustTokens.map(t => t.value).join('');
              const tsStable = RoundtripSemanticStabilizer.stabilizeRoundtrip(tsReconstruct);
              const rustStable = RoundtripSemanticStabilizer.stabilizeRoundtrip(rustReconstruct);
              roundtripParity = (tsStable === rustStable && tsStable !== '');
            } else {
              astDetails = 'No snapshots retrieved.';
            }
          } catch (e: any) {
            astDetails = `AST Build/Compare Exception: ${e.message}`;
          }
        } else {
          astDetails = `Run failed (Primary: ${primary.final_result}, Secondary: ${secondary.final_result})`;
        }

        const resultRecord = {
          index: i,
          profileName: targetProfile,
          payloadName: payloadInfo.name,
          payloadType: payloadInfo.intended_pathology,
          classification: profile.classification,
          queueDelay,
          phase: currentPhase,
          prediction,
          regimeShift: regime,
          telemetry_confidence: persistenceMetrics.telemetry_confidence ?? 1.0,
          astEqual,
          roundtripParity,
          astDetails,
          tsASTType,
          rustASTType,
          shedded: persistenceMetrics.shedded ?? false,
          sampled: persistenceMetrics.sampled ?? false
        };

        campaignResults.push(resultRecord);

        // Detect State-loop resonance
        const hasResonance = scheduler.detectTopologyResonance();

        console.log(`[Task ${completedCount}/${tasksCount}] Profile: ${targetProfile.padEnd(22)} | ` +
          `Confidence: ${(persistenceMetrics.telemetry_confidence ?? 1.0).toFixed(3)} | ` +
          `Parity: ${roundtripParity ? 'YES' : 'NO '} | ` +
          `Class: ${profile.classification.padEnd(16)} | ` +
          `Loop Resonance: ${hasResonance ? 'DETECTED!' : 'None      '} | ` +
          `RegimeShift: ${regime.shifted ? 'SHIFTED!' : 'Ok      '}`);

        return { status: 'success', profile };
      },
      (err) => {
        completedCount++;
        crashesCount++;
        const currentPhase = scheduler.classifyCollapsePhase(timeoutsCount, crashesCount);
        console.log(`[Task ${completedCount}/${tasksCount}] Concurrency task errored: ${err.message}. Phase: ${currentPhase}`);
        return { status: 'error', error: err };
      }
    );

    promises.push(taskPromise);
  }

  console.log(`[+] Running Phase 17 morphodynamics campaign concurrently...`);
  await Promise.all(promises);

  scheduler.shutdown();
  console.log(`[+] Concurrency campaign completed.`);

  // -----------------------------------------------------------------------------
  // 5. Print gorgeous campaign reports and math outcomes
  // -----------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log('            PHASE 17 ROUNDTRIP PARITY & MORPHODYNAMICS REPORT           ');
  console.log('========================================================================');
  
  const totalCompleted = campaignResults.length;
  const matchRuns = campaignResults.filter(r => r.roundtripParity);
  console.log(`  - Heterogeneous Roundtrip Parity:   ${matchRuns.length} / ${totalCompleted} PASS`);
  
  const sampledRuns = campaignResults.filter(r => r.sampled);
  console.log(`  - Sampled Runs with Entropy Windows:  ${sampledRuns.length}`);
  if (sampledRuns.length > 0) {
    console.log(`    * Weighted Topology Morphology Telemetry Confidence:`);
    for (const s of sampledRuns.slice(0, 4)) {
      console.log(`      Task ${s.index.toString().padStart(2)} (Delay ${s.queueDelay.toFixed(1).padStart(5)}ms): Frequency-Weighted Edge Preservation = ${s.telemetry_confidence.toFixed(4)}`);
    }
  }

  console.log('\n========================================================================');
  console.log('              SCHEDULER COLLAPSE & HYSTERETIC SCARS                     ');
  console.log('========================================================================');
  console.log(`* Hysteresis Energy Area (Shoelace integral): ${scheduler.getHysteresisArea().toFixed(2)} backlog-depth.ms`);
  console.log(`* Final Peak Backlog Depth:                   ${scheduler.peakBacklogDepth} tasks`);
  console.log(`* Scheduler Recovery Half-Life:                ${scheduler.recoveryHalfLifeMs} ms`);
  console.log(`* Queue Delay Growth Rate (1st order):        ${scheduler.getQueueDelayGrowthRate().toFixed(4)} ms/task`);
  console.log(`* Queue Delay Acceleration (2nd order):       ${scheduler.getQueueAcceleration().toFixed(4)} ms/task^2`);
  console.log(`* Stderr/Drain Latency Acceleration:           ${scheduler.getDrainLatencyAcceleration().toFixed(4)} ms/task^2`);
  console.log(`* Variance Growth Rate:                       ${scheduler.getVarianceGrowthRate().toFixed(4)} ms^2/task`);
  
  // Highlight regime shifts detected during burst transitions
  const shiftsDetected = campaignResults.filter(r => r.regimeShift.shifted);
  console.log(`\n* Non-linear Regime-Shift Detections:          ${shiftsDetected.length} times`);
  for (const s of shiftsDetected.slice(0, 3)) {
    console.log(`  - Regime Shift warning at Task ${s.index}: ${s.regimeShift.reason}`);
  }

  // Final validation check
  if (matchRuns.length === 0) {
    console.error('\n[!] ERROR: No successful roundtrip parity runs were recorded.');
    process.exit(1);
  }

  console.log('\n[SUCCESS] Phase 17 Roundtrip Semantic Stability & Collapse Morphodynamics Campaign complete.');
}

run().catch(err => {
  console.error('Campaign execution failed:', err);
  process.exit(1);
});
