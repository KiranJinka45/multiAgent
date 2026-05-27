import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ReplayExecutionContract, ReplayTelemetryProfile } from './dvk/harness/index.js';
import { ReplayQueueScheduler, RuntimePairExecutor } from './dvk/harness/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('========================================================================');
console.log('   ZTAN Harness - Phase 10 Replay Degradation Archaeology              ');
console.log('========================================================================');

const corpusPath = path.join(__dirname, 'dvk/corpus/corpus_cadence.json');
if (!fs.existsSync(corpusPath)) {
  console.error(`Error: Cadence corpus not found at ${corpusPath}`);
  process.exit(1);
}

const pathologies = JSON.parse(fs.readFileSync(corpusPath, 'utf8'));

async function run() {
  const entry = pathologies[0]; // repetitive_escapes
  console.log(`\n[+] Target Pathology: ${entry.provenance.intended_pathology}`);

  // Initialize ReplayQueueScheduler with concurrency = 3
  const scheduler = new ReplayQueueScheduler(3);
  const tasksCount = 20;

  console.log(`[+] Initializing ReplayQueueScheduler (Concurrency Pool Size: 3)`);
  console.log(`[+] Queueing ${tasksCount} tasks with asymmetrical and partial truncation sabotage matrix...`);

  const promises = [];

  for (let i = 0; i < tasksCount; i++) {
    // We configure asymmetric sabotage configurations across 4 categories to test decoupling
    let entropyProfile = {};

    if (i % 4 === 0) {
      // Configuration A: High jitter, low backpressure
      entropyProfile = {
        async_chunk_jitter: true,
        jitter_intensity: 2.0,
        stdout_fragmentation: true,
        backpressure_intensity: 0.2,
        scheduler_contention: false
      };
    } else if (i % 4 === 1) {
      // Configuration B: Low jitter, extreme stderr floods
      entropyProfile = {
        async_chunk_jitter: true,
        jitter_intensity: 0.1,
        stdout_fragmentation: false,
        scheduler_contention: true,
        stderr_flood_intensity: 3.0 // High intensity stderr write load
      };
    } else if (i % 4 === 2) {
      // Configuration C: Partial stdout truncation (Expected Failure)
      entropyProfile = {
        async_chunk_jitter: false,
        stdout_fragmentation: false,
        partial_stdout_truncation: true, // will cause parse error -> MALFORMED_ARTIFACT
        scheduler_contention: false
      };
    } else {
      // Configuration D: Starvation thread but no topology amplification
      entropyProfile = {
        async_chunk_jitter: false,
        stdout_fragmentation: true,
        backpressure_intensity: 1.0,
        scheduler_contention: true,
        stderr_flood_intensity: 0.5
      };
    }

    const contract: ReplayExecutionContract = {
      corpus_id: `${entry.corpus_id}_p10_t${i}`,
      deterministic_seed: `phase10_collapse_t${i}`,
      runtime_pair: { primary: 'typescript', secondary: 'typescript' },
      chunk_strategy: 'boundary_targeted',
      fragmentation_profile: { strategy: 'boundary_targeted' },
      snapshot_schema_version: 'v1.0',
      entropy_profile: entropyProfile
    };

    promises.push(
      scheduler.schedule(contract, entry.payload).then(
        profile => ({ status: 'success', profile, category: i % 4 }),
        err => ({ status: 'error', error: err, category: i % 4 })
      )
    );
  }

  console.log(`[+] Processing asymmetric execution queues...`);
  const results = await Promise.all(promises);
  scheduler.shutdown(); // Stop the event-loop lag monitor cleanly

  console.log(`[+] Executions complete.`);

  // Validation
  let successRuns = 0;
  let truncatedRuns = 0;
  let otherFailures = 0;

  const traceDigests = new Set<string>();
  const topologyFingerprints = new Set<string>();

  for (const res of results) {
    if (res.status === 'success') {
      const successRes = res as { status: 'success'; profile: ReplayTelemetryProfile; category: number };
      const primary = successRes.profile.primary_artifacts;
      if (primary.final_result === 'accept') {
        successRuns++;
        traceDigests.add(primary.trace_digest);
        if (primary.topology_fingerprint) {
          topologyFingerprints.add(primary.topology_fingerprint);
        }
      } else if (primary.infrastructure_failure === 'MALFORMED_ARTIFACT' && successRes.category === 2) {
        // Expected truncation failure
        truncatedRuns++;
      } else {
        otherFailures++;
        console.error(`[-] Run failed unexpectedly: Replay ID ${successRes.profile.replay_id}, result: ${primary.final_result}, error: ${primary.error_message}, failure class: ${primary.infrastructure_failure}`);
      }
    } else {
      const errRes = res as { status: 'error'; error: any; category: number };
      otherFailures++;
      console.error(`[-] Subprocess execution error:`, errRes.error);
    }
  }

  // Print Archaeology Report
  console.log(`\n=================== DEGRADATION ARCHAEOLOGY REPORT ===================`);
  console.log(`Total Scheduled Tasks:           ${tasksCount}`);
  console.log(`Successful Deterministic Runs:   ${successRuns} / ${tasksCount - 5} (Expected: all non-truncated succeed)`);
  console.log(`Expected Truncated Runs Caught:  ${truncatedRuns} / 5 (Expected: 5 MALFORMED_ARTIFACT)`);
  console.log(`Unexpected Orchestrator Failures: ${otherFailures}`);
  console.log(`Distinct Trace Digests (success): ${traceDigests.size} (Expected: 1 for absolute determinism)`);
  console.log(`Distinct Topology Hashes (success):${topologyFingerprints.size} (Expected: 1 for absolute path determinism)`);

  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const max = (arr: number[]) => arr.length > 0 ? Math.max(...arr) : 0;

  console.log(`\n[+] Orchestration Pressure Propagation Curves:`);
  console.log(`    - Max Event Loop Block Time:    ${scheduler.maxEventLoopBlockTime} ms`);
  console.log(`    - Max Backlog Queue Depth:       ${max(scheduler.backlogDepthHistory)} tasks`);
  console.log(`    - Avg Queue Delay:               ${avg(scheduler.queueDelays).toFixed(2)} ms`);
  console.log(`    - Queue Delay Growth Rate:       ${scheduler.getQueueDelayGrowthRate().toFixed(4)} ms/task`);
  console.log(`    - Replay Completion Variance:    ${scheduler.getReplayCompletionVariance().toFixed(4)} ms^2`);
  console.log(`    - Avg Stdout Drain Latency:      ${avg(scheduler.stdoutDrainLatencies).toFixed(2)} ms`);
  console.log(`    - Max Stdout Drain Latency:      ${max(scheduler.stdoutDrainLatencies).toFixed(2)} ms`);

  // Asserting expected behavior
  if (truncatedRuns !== 5) {
    throw new Error(`[CRITICAL] Partial replay failure propagation failed! Expected 5 truncated runs, got ${truncatedRuns}`);
  }
  if (otherFailures > 0) {
    throw new Error(`[CRITICAL] Unexpected failures or subprocess leaks detected during asymmetric campaigns!`);
  }
  if (traceDigests.size > 1 || topologyFingerprints.size > 1) {
    throw new Error(`[CRITICAL] Determinism or path determinism broken under decoupled asymmetric sabotage!`);
  }

  // 4. Rust Runtime Restoration Verification
  console.log(`\n[+] Verifying Rust bridge graceful path-checking...`);
  const rustContract: ReplayExecutionContract = {
    corpus_id: 'rust_restoration_test',
    deterministic_seed: 'rust_test_seed',
    runtime_pair: { primary: 'rust', secondary: 'typescript' },
    chunk_strategy: 'boundary_targeted',
    fragmentation_profile: { strategy: 'boundary_targeted' },
    snapshot_schema_version: 'v1.0'
  };

  const collector = await RuntimePairExecutor.execute(rustContract, entry.payload);
  const primaryResult = collector.generateProfile('none', null, []).primary_artifacts.final_result;
  console.log(`    Rust bridge run resolved to: ${primaryResult} (Mocked fallback or real Rust run)`);

  console.log(`\n[SUCCESS] Phase 10 Validation Complete. Replay degradation archaeology and asymmetric sabotage verified.`);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
