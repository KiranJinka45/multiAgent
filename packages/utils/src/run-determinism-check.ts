import type { ReplayExecutionContract } from './dvk/harness/index.js';
import { DeterminismVerifier, ReplayShrinker, RuntimePairExecutor } from './dvk/harness/index.js';

console.log('===========================================================');
console.log('    ZTAN Differential Validation Harness - Determinism     ');
console.log('===========================================================');

const contract: ReplayExecutionContract = {
  corpus_id: 'test_corpus_002',
  deterministic_seed: 'delta_echo_foxtrot',
  runtime_pair: { primary: 'rust', secondary: 'typescript' },
  chunk_strategy: 'boundary_targeted',
  fragmentation_profile: { strategy: 'boundary_targeted' },
  snapshot_schema_version: 'v1.0'
};

const payload = '{"determinism": "check", "metric": "test"}';

async function run() {
  console.log(`\n[1] Verifying Replay Determinism (3 iterations)...`);
  try {
    await DeterminismVerifier.verifyDeterminism(contract, payload, 3);
    console.log('  [PASS] Absolute determinism verified across all runs.');
  } catch (e: any) {
    console.log(`  [FAIL] ${e.message}`);
  }

  console.log(`\n[2] Executing Single Profiling Pass...`);
  const profile = await RuntimePairExecutor.executeAndCompare(contract, payload);
  console.log(`  Classification: ${profile.classification}`);

  if (profile.primary_artifacts.metrics) {
    console.log(`  [METRICS] TS Snapshots per chunk: ${profile.secondary_artifacts.metrics?.snapshots_per_chunk.join(', ')}`);
    console.log(`  [METRICS] TS Total Snapshots: ${profile.secondary_artifacts.metrics?.total_snapshots}`);
    console.log(`  [METRICS] Rust Snapshots per chunk: ${profile.primary_artifacts.metrics?.snapshots_per_chunk.join(', ')}`);
  }

  // In order to test the Shrinker, we must have a classification that is NOT 'none' or 'recovering_divergence'
  // Currently, rust fails with MALFORMED_ARTIFACT since `cargo` is missing. We can use this to test shrinking!
  if (profile.classification !== 'none') {
    console.log(`\n[3] Testing Replay Shrinker on ${profile.classification}...`);
    const result = await ReplayShrinker.shrink(contract, payload, profile.classification);
    console.log(`  [SHRINKER] Original Payload: ${result.original_payload.length} bytes`);
    console.log(`  [SHRINKER] Shrunk Payload: ${result.shrunk_payload.length} bytes`);
    console.log(`  [SHRINKER] Shrunk Result: '${result.shrunk_payload}'`);
    console.log(`  [SHRINKER] Iterations: ${result.iterations}`);
  }
}

run().catch(console.error);
