import type { ReplayExecutionContract } from './dvk/harness/index.js';
import { DeterminismVerifier } from './dvk/harness/index.js';

console.log('===========================================================');
console.log('    ZTAN Differential Validation Harness - Entropy Test    ');
console.log('===========================================================');

const contract: ReplayExecutionContract = {
  corpus_id: 'entropy_test_001',
  deterministic_seed: 'gamma_ray_burst',
  runtime_pair: { primary: 'rust', secondary: 'typescript' },
  chunk_strategy: 'boundary_targeted',
  fragmentation_profile: { strategy: 'boundary_targeted' },
  snapshot_schema_version: 'v1.0',
  entropy_profile: {
    async_chunk_jitter: true,
    randomized_boundaries: true,
    stdout_fragmentation: false
  }
};

const payload = '{"endurance": "test", "complex": "value with space", "nested": {"a": 1, "b": [1,2,3]}}';

console.log(`\n[1] Starting 10-Iteration Endurance Campaign with Entropy Injection...`);
try {
  DeterminismVerifier.runEnduranceCampaign(contract, payload, 10);
  console.log('  [PASS] Absolute determinism verified against async latency and boundary scrambling!');
} catch (e: any) {
  console.log(`  [FAIL] ${e.message}`);
}
