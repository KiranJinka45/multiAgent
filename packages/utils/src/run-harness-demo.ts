import type { ReplayExecutionContract } from './dvk/harness/index.js';
import { RuntimePairExecutor } from './dvk/harness/index.js';

console.log('===========================================================');
console.log('    ZTAN Differential Validation Harness - Mock Demo       ');
console.log('===========================================================');

const contract: ReplayExecutionContract = {
  corpus_id: 'test_corpus_001',
  deterministic_seed: 'alpha_bravo_charlie',
  runtime_pair: { primary: 'rust', secondary: 'typescript' },
  chunk_strategy: 'boundary_targeted',
  fragmentation_profile: { strategy: 'boundary_targeted' },
  snapshot_schema_version: 'v1.0'
};

const payload = '{"test": 123, "utf8": "a\u0308", "esc": "split\\\\here"}';

async function run() {
  console.log(`\n[INIT] Starting ReplayExecutionContract for ${contract.corpus_id}`);
  console.log(`[STRAT] Fragmentation Strategy: ${contract.chunk_strategy}`);
  console.log(`[TARGET] Pair: ${contract.runtime_pair.primary} ↔ ${contract.runtime_pair.secondary}`);

  const resultProfile = await RuntimePairExecutor.executeAndCompare(contract, payload);

  console.log('\n[RESULTS] Harness Execution Complete.');
  console.log(`  Replay ID: ${resultProfile.replay_id}`);
  console.log(`  Chunks Generated: ${resultProfile.chunk_layout_sizes.length} chunks (${resultProfile.chunk_layout_sizes.join(', ')} bytes)`);
  console.log(`  Classification: ${resultProfile.classification}`);

  if (resultProfile.first_divergence_index !== null) {
    console.log(`  First Divergence Index: ${resultProfile.first_divergence_index}`);
  }

  console.log('\n[TELEMETRY] Divergence Windows:');
  if (resultProfile.divergence_windows.length === 0) {
    console.log('  None. Perfect convergence.');
  } else {
    resultProfile.divergence_windows.forEach(w => {
      console.log(`  [${w.start_snapshot}, ${w.end_snapshot === null ? 'persistent' : w.end_snapshot}]`);
    });
  }
}

run().catch(console.error);
