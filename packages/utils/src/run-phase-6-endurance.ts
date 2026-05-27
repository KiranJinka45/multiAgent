import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ReplayExecutionContract } from './dvk/harness/index.js';
import { DeterminismVerifier } from './dvk/harness/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('===========================================================');
console.log('   ZTAN Harness - Phase 6 Transport Endurance Campaign     ');
console.log('===========================================================');

const corpusPath = path.join(__dirname, 'dvk/corpus/corpus_pathology.json');
const pathologies = JSON.parse(fs.readFileSync(corpusPath, 'utf8'));

for (const entry of pathologies) {
  const contract: ReplayExecutionContract = {
    corpus_id: entry.corpus_id,
    deterministic_seed: 'phase6_entropy_' + entry.corpus_id,
    runtime_pair: { primary: 'typescript', secondary: 'typescript' },
    chunk_strategy: 'boundary_targeted',
    fragmentation_profile: { strategy: 'boundary_targeted' },
    snapshot_schema_version: 'v1.0',
    entropy_profile: {
      async_chunk_jitter: true,
      randomized_boundaries: true,
      stdout_fragmentation: true,
      partial_stdout_truncation: false, // Don't truncate exactly, we want it to parse properly for metrics
      delayed_final_newline: true,
      duplicated_chunk_delivery: false
    }
  };

  console.log(`\n[+] Testing Pathology: ${entry.provenance.intended_pathology}`);
  console.log(`    Target: ${entry.provenance.targeted_fsm_region} -> ${entry.provenance.targeted_decoder_state}`);
  console.log(`    Running 50 Iterations...`); // Scale to 50 per payload (5 payloads = 250 total)

  try {
    DeterminismVerifier.runEnduranceCampaign(contract, entry.payload, 50);
    console.log('  [PASS] 50/50 deterministic iterations survived transport sabotage!');
  } catch (e: any) {
    console.log(`  [FAIL] ${e.message}`);
  }
}
