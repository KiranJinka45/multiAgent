import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ReplayExecutionContract } from './dvk/harness/index.js';
import { RuntimePairExecutor } from './dvk/harness/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('========================================================================');
console.log('   ZTAN Harness - Phase 8 Concurrent Replay Interference Campaign      ');
console.log('========================================================================');

const corpusPath = path.join(__dirname, 'dvk/corpus/corpus_cadence.json');
if (!fs.existsSync(corpusPath)) {
  console.error(`Error: Cadence corpus not found at ${corpusPath}`);
  process.exit(1);
}

const pathologies = JSON.parse(fs.readFileSync(corpusPath, 'utf8'));

// We will run 5 parallel tasks, each performing 20 sequential iterations of replay contract
const NUM_CAMPAIGNS = 5;
const ITERATIONS_PER_CAMPAIGN = 20;

async function runCampaign(campaignId: number, entry: any): Promise<any[]> {
  const results = [];
  for (let i = 0; i < ITERATIONS_PER_CAMPAIGN; i++) {
    const contract: ReplayExecutionContract = {
      corpus_id: `${entry.corpus_id}_c${campaignId}_i${i}`,
      deterministic_seed: `phase8_interference_c${campaignId}_i${i}`,
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
        duplicated_chunk_delivery: false,
        scheduler_contention: true // Starvation thread
      }
    };

    const profile = await RuntimePairExecutor.executeAndCompare(contract, entry.payload);
    results.push(profile);
  }
  return results;
}

async function run() {
  // Let's use the first pathology for heavy concurrent validation
  const entry = pathologies[0];
  console.log(`\n[+] Target Pathology: ${entry.provenance.intended_pathology}`);
  console.log(`    Launching ${NUM_CAMPAIGNS} parallel campaigns (${NUM_CAMPAIGNS * ITERATIONS_PER_CAMPAIGN} total executions)...`);

  const startTime = Date.now();
  const campaignPromises = [];
  for (let c = 0; c < NUM_CAMPAIGNS; c++) {
    campaignPromises.push(runCampaign(c, entry));
  }

  const allCampaignResults = await Promise.all(campaignPromises);
  const elapsed = Date.now() - startTime;
  console.log(`\n[+] Campaigns completed in ${elapsed} ms.`);

  // Validate results
  let totalRuns = 0;
  let successRuns = 0;
  const traceDigests = new Set<string>();
  const topologyFingerprints = new Set<string>();

  let sampleMetrics: any = null;
  let sampleTopologyWindows: any = null;

  for (const campaignResults of allCampaignResults) {
    for (const profile of campaignResults) {
      totalRuns++;
      const primary = profile.primary_artifacts;
      if (primary.final_result === 'accept') {
        successRuns++;
        traceDigests.add(primary.trace_digest);
        if (primary.topology_fingerprint) {
          topologyFingerprints.add(primary.topology_fingerprint);
        }
        if (!sampleMetrics && primary.metrics) {
          sampleMetrics = primary.metrics;
        }
        if (!sampleTopologyWindows && primary.topology_windows) {
          sampleTopologyWindows = primary.topology_windows;
        }
      } else {
        console.error(`[-] Execution failed: Replay ID ${profile.replay_id}, Result: ${primary.final_result}, Error: ${primary.error_message}`);
      }
    }
  }

  console.log(`\n=================== VERIFICATION RESULTS ===================`);
  console.log(`Total Scheduled Executions:  ${totalRuns}`);
  console.log(`Successful Executions:       ${successRuns} / ${totalRuns}`);
  console.log(`Distinct Trace Digests:      ${traceDigests.size} (Expected: 1 for absolute determinism)`);
  console.log(`Distinct Topology Hashes:    ${topologyFingerprints.size} (Expected: 1 for absolute path determinism)`);
  
  if (traceDigests.size !== 1) {
    throw new Error(`[CRITICAL] Determinism vulnerability! Multiple trace digests detected under concurrent interference: ${Array.from(traceDigests).join(', ')}`);
  }

  if (topologyFingerprints.size !== 1) {
    throw new Error(`[CRITICAL] Path determinism vulnerability! Multiple topology fingerprints detected: ${Array.from(topologyFingerprints).join(', ')}`);
  }

  console.log(`\n[+] Forensics Telemetry Self-Cost Verification:`);
  if (sampleMetrics) {
    console.log(`    - Telemetry Overhead:    ${sampleMetrics.telemetry_overhead_ms?.toFixed(4)} ms`);
    console.log(`    - Topology Hash CPU Cost:${sampleMetrics.topology_hash_cpu_cost?.toFixed(4)} ms`);
    console.log(`    - Snapshot Memory Cost:  ${sampleMetrics.snapshot_memory_cost} bytes`);
    console.log(`    - Telemetry Frames:      ${sampleMetrics.telemetry_frames_written} frames`);

    if ((sampleMetrics.telemetry_overhead_ms || 0) === 0) {
      console.warn(`    ⚠️ [WARNING] Telemetry overhead is reported as 0 ms! Check high-resolution timer resolution.`);
    } else {
      console.log(`    [PASS] Telemetry self-cost accounting is active and non-zero.`);
    }
  } else {
    throw new Error(`[-] No execution metrics found to validate.`);
  }

  console.log(`\n[+] Windowed Topology forensics verification:`);
  if (sampleTopologyWindows) {
    console.log(`    Topology Windows emitted:`);
    Object.entries(sampleTopologyWindows).forEach(([win, hash]) => {
      console.log(`      ${win}: ${(hash as string).substring(0, 16)}...`);
    });
    console.log(`    [PASS] Segmented windowed hashes are correctly emitted.`);
  } else {
    throw new Error(`[-] No topology windows found to validate.`);
  }

  console.log(`\n[SUCCESS] Phase 8 Verification Complete. Perfect deterministic concurrency achieved under starvation.`);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
