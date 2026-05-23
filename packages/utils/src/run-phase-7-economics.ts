import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ReplayExecutionContract } from './dvk/harness/index.js';
import { RuntimePairExecutor, DeterminismVerifier } from './dvk/harness/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('========================================================================');
console.log('   ZTAN Harness - Phase 7 Telemetry & Starvation Endurance Campaign     ');
console.log('========================================================================');

const corpusPath = path.join(__dirname, 'dvk/corpus/corpus_cadence.json');
if (!fs.existsSync(corpusPath)) {
  console.error(`Error: Cadence corpus not found at ${corpusPath}`);
  process.exit(1);
}

const pathologies = JSON.parse(fs.readFileSync(corpusPath, 'utf8'));

async function run() {
  for (const entry of pathologies) {
    const contract: ReplayExecutionContract = {
      corpus_id: entry.corpus_id,
      deterministic_seed: 'phase7_economics_' + entry.corpus_id,
      runtime_pair: { primary: 'typescript', secondary: 'typescript' },
      chunk_strategy: 'boundary_targeted',
      fragmentation_profile: { strategy: 'boundary_targeted' },
      snapshot_schema_version: 'v1.0',
      entropy_profile: {
        async_chunk_jitter: true,
        randomized_boundaries: true,
        stdout_fragmentation: true,
        partial_stdout_truncation: false,
        delayed_final_newline: true,
        duplicated_chunk_delivery: false, // Must be false for endurance campaign to maintain semantic payload invariance
        scheduler_contention: true // Active host starvation spinner enabled!
      }
    };

    console.log(`\n[+] Testing Cadence Pathology: ${entry.provenance.intended_pathology}`);
    console.log(`    Target: ${entry.provenance.targeted_fsm_region} -> ${entry.provenance.targeted_decoder_state}`);
    console.log(`    Simulating Starvation + Layered Transport Sabotage...`);

    try {
      // Run endurance campaign to verify absolute determinism under resource starvation
      await DeterminismVerifier.runEnduranceCampaign(contract, entry.payload, 15);
      console.log('  [PASS] 15/15 deterministic iterations survived starvation + sabotage!');

      // Execute one single comparison run to extract deep economics telemetry
      const profile = await RuntimePairExecutor.executeAndCompare(contract, entry.payload);
      
      const primary = profile.primary_artifacts;
      const metrics = primary.metrics;
      
      console.log(`    ----------------- REPLAY ECONOMICS PROFILE -----------------`);
      console.log(`    Validation Mode:   ${primary.cross_runtime_mode?.toUpperCase()}`);
      if (primary.cross_runtime_mode === 'mirrored') {
        console.warn(`    ⚠️  [ADVISORY] Mirrored Validation Only: ts:ts. Semantic parity is not validated.`);
      }
      console.log(`    Final Status:      ${primary.final_result}`);
      console.log(`    Trace Digest:      ${primary.trace_digest.substring(0, 16)}...`);
      console.log(`    Topology Hash:     ${primary.topology_fingerprint?.substring(0, 16)}...`);
      console.log(`    Wall Clock Time:   ${metrics?.replay_wall_clock_ms?.toFixed(2)} ms`);
      console.log(`    Transport Jitter:  ${metrics?.chunk_stall_ms?.toFixed(2)} ms`);
      console.log(`    Throughput Rate:   ${metrics?.throughput_bytes_per_sec?.toFixed(2)} bytes/sec`);
      console.log(`    Snapshots/Sec:     ${metrics?.snapshots_per_sec?.toFixed(2)}`);
      console.log(`    Transitions/Byte:  ${metrics?.transitions_per_byte?.toFixed(2)}`);
      console.log(`    IPC Frame Count:   ${metrics?.stdout_frame_count}`);
      console.log(`    Peak Heap Memory:  ${((metrics?.replay_memory_peak || 0) / 1024 / 1024).toFixed(2)} MB`);
      console.log(`    Provenance Info:   ${JSON.stringify(primary.provenance_lineage)}`);
      console.log(`    ------------------------------------------------------------`);
    } catch (e: any) {
      console.log(`  [FAIL] ${e.message}`);
      process.exit(1);
    }
  }

  console.log('\n[SUCCESS] Phase 7 Telemetry & Starvation Campaign completed.');
}

run().catch(console.error);
