import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ReplayExecutionContract } from './dvk/harness/index.js';
import { ReplayQueueScheduler, ReplayPersistenceManager, SemanticObjectProjector } from './dvk/harness/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('========================================================================');
console.log('   ZTAN Harness - Phase 16 Ecosystem Parity, Unicode & Edges campaign   ');
console.log('========================================================================');

const targetDbPath = path.join(process.cwd(), 'replay_db.json');
ReplayPersistenceManager.setDbPath(targetDbPath);

// Clear previous DB
ReplayPersistenceManager.clear();
console.log(`[+] Cleared database file 'replay_db.json'`);

// 1. Direct unit checks for Unicode Forensics
console.log('\n[+] Running Direct Unit Validation on Unicode Forensics...');
const zwjForensics = SemanticObjectProjector.scanUnicodeForensics('👨‍👩‍👧‍👦');
console.log(`  * ZWJ Emoji check: ZWJ=${zwjForensics.hasZWJ}`);
if (!zwjForensics.hasZWJ) {
  throw new Error('ZWJ detection failed.');
}

const rtlForensics = SemanticObjectProjector.scanUnicodeForensics('abc\u202Edef');
console.log(`  * RTL Override check: RTL=${rtlForensics.hasRTL}`);
if (!rtlForensics.hasRTL) {
  throw new Error('RTL detection failed.');
}

const homoglyphForensics = SemanticObjectProjector.scanUnicodeForensics('Cyrillic \u0430 (а) vs Latin a');
console.log(`  * Homoglyph confusable check: Homoglyph=${homoglyphForensics.hasHomoglyph}`);
if (!homoglyphForensics.hasHomoglyph) {
  throw new Error('Homoglyph detection failed.');
}
console.log('[+] Direct Unicode Forensics checks: ALL PASS');

// 2. Direct unit checks for Ecosystem Profiles key-duplication & order behavior
console.log('\n[+] Running Direct Unit Validation on Ecosystem AST Parsing...');

// A. ECMA262: Last key wins, unordered key check
const ecma262Tokens = [
  { token_type: 'LEFT_BRACE', value: '{', start: 0, end: 1 },
  { token_type: 'STRING', value: 'foo', start: 1, end: 6 },
  { token_type: 'COLON', value: ':', start: 6, end: 7 },
  { token_type: 'LITERAL', value: '1', start: 7, end: 8 },
  { token_type: 'COMMA', value: ',', start: 8, end: 9 },
  { token_type: 'STRING', value: 'foo', start: 9, end: 14 },
  { token_type: 'COLON', value: ':', start: 14, end: 15 },
  { token_type: 'LITERAL', value: '2', start: 15, end: 16 },
  { token_type: 'RIGHT_BRACE', value: '}', start: 16, end: 17 }
];
const ecmaAST = SemanticObjectProjector.buildAST(ecma262Tokens, 'ecma262');
const ecmaObj = ecmaAST.children as any[];
if (ecmaObj.length !== 1 || ecmaObj[0].value.value !== 2) {
  throw new Error('ECMA262 last-key-wins parsing failed.');
}
console.log('  * ECMA262 last-key-wins duplicate handling: PASS');

// B. LEGACY_FIRST_WIN: First key wins
const legacyAST = SemanticObjectProjector.buildAST(ecma262Tokens, 'legacy_first_win');
const legacyObj = legacyAST.children as any[];
if (legacyObj.length !== 1 || legacyObj[0].value.value !== 1) {
  throw new Error('LEGACY_FIRST_WIN first-key-wins parsing failed.');
}
console.log('  * LEGACY_FIRST_WIN first-key-wins duplicate handling: PASS');

// C. DUPLICATE_ERROR & RFC8259_STRICT: Throw on duplicates
try {
  SemanticObjectProjector.buildAST(ecma262Tokens, 'duplicate_error');
  throw new Error('DUPLICATE_ERROR failed to throw on duplicate key.');
} catch (e: any) {
  if (!e.message.includes('[DUPLICATE_ERROR]')) {
    throw new Error(`DUPLICATE_ERROR threw unexpected error: ${e.message}`);
  }
  console.log('  * DUPLICATE_ERROR throw on duplicates: PASS');
}

try {
  SemanticObjectProjector.buildAST(ecma262Tokens, 'rfc8259_strict');
  throw new Error('RFC8259_STRICT failed to throw on duplicate key.');
} catch (e: any) {
  if (!e.message.includes('[RFC8259_STRICT]')) {
    throw new Error(`RFC8259_STRICT threw unexpected error: ${e.message}`);
  }
  console.log('  * RFC8259_STRICT throw on duplicates: PASS');
}

// D. RFC8259_STRICT: Strict key order check
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
const astOrderA = SemanticObjectProjector.buildAST(orderTokensA, 'ecma262');
const astOrderB = SemanticObjectProjector.buildAST(orderTokensB, 'ecma262');

// Under ecma262, key-order differences should compare equal semantically (unordered)
const compEcma = SemanticObjectProjector.compareASTs(astOrderA, astOrderB, '', 'ecma262');
if (!compEcma.isEqual) {
  throw new Error('ECMA262 unordered comparison failed.');
}
console.log('  * ECMA262 order-independent key-value matching: PASS');

// Under rfc8259_strict, key-order differences must throw
try {
  SemanticObjectProjector.compareASTs(astOrderA, astOrderB, '', 'rfc8259_strict');
  throw new Error('RFC8259_STRICT failed to throw on key order mismatch.');
} catch (e: any) {
  if (!e.message.includes('[RFC8259_STRICT] Key-order mismatch')) {
    throw new Error(`RFC8259_STRICT threw unexpected key-order error: ${e.message}`);
  }
  console.log('  * RFC8259_STRICT strict key-order checking: PASS');
}
console.log('[+] Direct Ecosystem AST Parsing checks: ALL PASS');

// 3. Define campaign payloads
const testPayloads = [
  {
    name: 'Unicode ZWJ sequence',
    payload: '{"emojis": "👨‍👩‍👧‍👦", "heart": "❤️"}',
    intended_pathology: 'unicode_zwj'
  },
  {
    name: 'Bidirectional RTL control text',
    payload: '{"dir_override": "LTR\\u202E_RTL_text_here"}',
    intended_pathology: 'unicode_rtl'
  },
  {
    name: 'Homoglyph shadow confusables',
    payload: '{"latin_a": "abc", "cyrillic_a\\u0430": "shadow_a"}',
    intended_pathology: 'unicode_homoglyphs'
  },
  {
    name: 'Duplicate keys layout',
    payload: '{"dup": "first", "dup": "second", "normal": 42}',
    intended_pathology: 'duplicate_keys'
  }
];

async function run() {
  console.log(`\n[+] Initializing ReplayQueueScheduler for Concurrency Campaign`);
  const scheduler = new ReplayQueueScheduler(2);

  const tasksCount = 30;
  console.log(`[+] Queueing ${tasksCount} compatibility tasks over 4 ecosystem profiles...`);

  const promises = [];
  let completedCount = 0;
  let timeoutsCount = 0;
  let crashesCount = 0;

  const campaignResults: any[] = [];

  for (let i = 0; i < tasksCount; i++) {
    const payloadInfo = testPayloads[i % testPayloads.length];
    
    // Choose ecosystem profile round robin
    const profiles: ('rfc8259_strict' | 'ecma262' | 'legacy_first_win' | 'duplicate_error')[] = [
      'ecma262',
      'legacy_first_win',
      'duplicate_error',
      'rfc8259_strict'
    ];
    const targetProfile = profiles[i % profiles.length];

    let entropyProfile: any = {};
    let flushInterval = 64;

    // Simulate different loads
    if (i < 6) {
      entropyProfile = {
        async_chunk_jitter: false,
        stdout_fragmentation: false
      };
    } else if (i < 18) {
      // Moderate perturbation -> triggers sampling & prediction
      entropyProfile = {
        async_chunk_jitter: true,
        jitter_intensity: 1.5,
        stdout_fragmentation: true,
        backpressure_intensity: 1.5
      };
      flushInterval = 16;
    } else if (i < 26) {
      // High perturbation -> triggers write shedding & prediction warning alerts
      entropyProfile = {
        async_chunk_jitter: true,
        jitter_intensity: 3.5,
        stdout_fragmentation: true,
        backpressure_intensity: 3.5,
        scheduler_contention: true,
        stderr_flood_intensity: 3.5
      };
      flushInterval = 8;
    } else {
      entropyProfile = {
        async_chunk_jitter: false,
        stdout_fragmentation: false
      };
    }

    const contract: ReplayExecutionContract = {
      corpus_id: `conformance_p16_t${i}_${payloadInfo.intended_pathology}`,
      deterministic_seed: `phase16_t${i}`,
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

        const persistOptions = {
          compress: true,
          batchThreshold: 1,
          retentionCeiling: 100,
          queueDelayMs: queueDelay,
          pressureCeilingMs: 1500, // Trigger shedded/sampled under concurrency
          enableAdaptiveShedding: true,
          enableTopologySampling: true,
        };

        ReplayPersistenceManager.saveProfile(profile, persistOptions);

        const savedProfiles = ReplayPersistenceManager.loadAllProfiles();
        const latestSaved = savedProfiles[savedProfiles.length - 1];
        const persistenceMetrics = latestSaved?.persistence_metrics || {};

        let astEqual = false;
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
          telemetry_confidence: persistenceMetrics.telemetry_confidence ?? 1.0,
          astEqual,
          astDetails,
          tsASTType,
          rustASTType,
          shedded: persistenceMetrics.shedded ?? false,
          sampled: persistenceMetrics.sampled ?? false
        };

        campaignResults.push(resultRecord);

        console.log(`[Task ${completedCount}/${tasksCount}] Profile: ${targetProfile} | ` +
          `Payload: "${payloadInfo.name}" | ` +
          `Confidence: ${(persistenceMetrics.telemetry_confidence ?? 1.0).toFixed(3)} | ` +
          `AST Equal: ${astEqual ? 'YES' : 'NO'} | ` +
          `Class: ${profile.classification}` +
          (astEqual ? '' : ` | Info: ${astDetails}`));

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

  console.log(`[+] Running compatibility campaign concurrently...`);
  await Promise.all(promises);

  scheduler.shutdown();
  console.log(`[+] Compatibility campaign completed.`);

  // Write out statistics
  console.log('\n========================================================================');
  console.log('              PHASE 16 ECOSYSTEM PARITY STATS REPORT                    ');
  console.log('========================================================================');
  
  const totalCompleted = campaignResults.length;
  const matchRuns = campaignResults.filter(r => r.astEqual);
  console.log(`  - AST Parity Runs:                  ${matchRuns.length} / ${totalCompleted}`);
  
  const expectedFails = campaignResults.filter(r => r.astDetails.includes('Duplicate key detected') || r.astDetails.includes('Key-order mismatch'));
  console.log(`  - Expected Ecosystem Exceptions:    ${expectedFails.length}`);
  for (const f of expectedFails.slice(0, 3)) {
    console.log(`    * Checked Exception: Profile=${f.profileName} | Exception="${f.astDetails}"`);
  }

  const sampledRuns = campaignResults.filter(r => r.sampled);
  console.log(`  - Sampled Runs with Entropy Widening: ${sampledRuns.length}`);
  if (sampledRuns.length > 0) {
    console.log(`    * Sampled Telemetry Confidence (Forensic Edge Weighted):`);
    for (const s of sampledRuns.slice(0, 3)) {
      console.log(`      Task ${s.index} (Delay ${s.queueDelay.toFixed(1)}ms): Confidence = ${s.telemetry_confidence.toFixed(4)}`);
    }
  }

  console.log('\n========================================================================');
  console.log('              SCHEDULER COLLAPSE & ADAPTIVE METRICS                    ');
  console.log('========================================================================');
  console.log(`Queue Acceleration:          ${scheduler.getQueueAcceleration().toFixed(4)} ms/task^2`);
  console.log(`Drain Latency Acceleration:  ${scheduler.getDrainLatencyAcceleration().toFixed(4)} ms/task^2`);
  console.log(`Variance Growth Rate:        ${scheduler.getVarianceGrowthRate().toFixed(4)} ms^2/task`);
  console.log(`Memory Growth Rate:          ${scheduler.getMemoryGrowthRate().toFixed(4)} bytes/task`);
  console.log(`Memory Acceleration:         ${scheduler.getMemoryAcceleration().toFixed(4)} bytes/task^2`);
  console.log(`Replay Recovery Half-Life:   ${scheduler.recoveryHalfLifeMs} ms`);

  console.log('\n[SUCCESS] ZTAN differential verification campaign complete under Phase 16 profiles.');
}

run().catch(err => {
  console.error('Campaign execution failed:', err);
  process.exit(1);
});
