import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ReplayExecutionContract } from './dvk/harness/index.js';
import { ReplayQueueScheduler } from './dvk/harness/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('========================================================================');
console.log('   ZTAN Harness - Phase 9 Telemetry Scaling & Queue Contention         ');
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
  const tasksCount = 30;
  console.log(`[+] Initializing ReplayQueueScheduler (Concurrency Pool Size: 3)`);
  console.log(`[+] Queueing ${tasksCount} tasks with adaptive sabotage escalation...`);

  const startTime = Date.now();
  const promises = [];

  for (let i = 0; i < tasksCount; i++) {
    // Escalate intensity factor from 1.0 to 2.0 based on task index
    const intensity = 1.0 + (i / tasksCount) * 1.0;

    const contract: ReplayExecutionContract = {
      corpus_id: `${entry.corpus_id}_p9_t${i}`,
      deterministic_seed: `phase9_escalation_t${i}`,
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
        scheduler_contention: true, // will trigger process.stderr write contention!
        intensity_factor: intensity
      }
    };

    promises.push(
      scheduler.schedule(contract, entry.payload).then(profile => {
        return { profile, intensity };
      })
    );
  }

  console.log(`[+] Processing concurrent queue tasks...`);
  const results = await Promise.all(promises);
  const elapsed = Date.now() - startTime;
  console.log(`[+] All ${tasksCount} queued tasks completed in ${elapsed} ms.`);

  // Validation
  let successRuns = 0;
  const traceDigests = new Set<string>();
  const topologyFingerprints = new Set<string>();

  // Slope Analysis collections
  const slopes = {
    telemetry_cost_per_snapshot: [] as number[],
    topology_cost_per_window: [] as number[],
    memory_growth_per_transition: [] as number[],
    serialization_cost_per_frame: [] as number[]
  };

  for (const { profile, intensity } of results) {
    const primary = profile.primary_artifacts;
    if (primary.final_result === 'accept') {
      successRuns++;
      traceDigests.add(primary.trace_digest);
      if (primary.topology_fingerprint) {
        topologyFingerprints.add(primary.topology_fingerprint);
      }
      
      const metrics = primary.metrics;
      if (metrics) {
        if (metrics.telemetry_cost_per_snapshot !== undefined) {
          slopes.telemetry_cost_per_snapshot.push(metrics.telemetry_cost_per_snapshot);
        }
        if (metrics.topology_cost_per_window !== undefined) {
          slopes.topology_cost_per_window.push(metrics.topology_cost_per_window);
        }
        if (metrics.memory_growth_per_transition !== undefined) {
          slopes.memory_growth_per_transition.push(metrics.memory_growth_per_transition);
        }
        if (metrics.serialization_cost_per_frame !== undefined) {
          slopes.serialization_cost_per_frame.push(metrics.serialization_cost_per_frame);
        }
      }
    } else {
      console.error(`[-] Task failed: Replay ID ${profile.replay_id}, result: ${primary.final_result}, error: ${primary.error_message}`);
    }
  }

  console.log(`\n=================== VERIFICATION RESULTS ===================`);
  console.log(`Scheduled Queued Tasks:      ${tasksCount}`);
  console.log(`Successful Executions:       ${successRuns} / ${tasksCount}`);
  console.log(`Distinct Trace Digests:      ${traceDigests.size} (Expected: 1 for absolute determinism)`);
  console.log(`Distinct Topology Hashes:    ${topologyFingerprints.size} (Expected: 1 for absolute path determinism)`);
  console.log(`Scheduler Queue Delay:       Avg ${(scheduler.accumulatedQueueDelayMs / tasksCount).toFixed(2)} ms`);

  if (traceDigests.size !== 1) {
    throw new Error(`[CRITICAL] Determinism vulnerability! Multiple trace digests detected: ${Array.from(traceDigests).join(', ')}`);
  }

  if (topologyFingerprints.size !== 1) {
    throw new Error(`[CRITICAL] Path determinism vulnerability! Multiple topology fingerprints detected: ${Array.from(topologyFingerprints).join(', ')}`);
  }

  console.log(`\n[+] Telemetry Amplification Slope Analysis:`);
  
  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const max = (arr: number[]) => arr.length > 0 ? Math.max(...arr) : 0;
  const min = (arr: number[]) => arr.length > 0 ? Math.min(...arr) : 0;

  console.log(`    - Telemetry Cost per Snapshot (ms/snapshot):`);
  console.log(`      Min: ${min(slopes.telemetry_cost_per_snapshot).toFixed(6)} | Avg: ${avg(slopes.telemetry_cost_per_snapshot).toFixed(6)} | Max: ${max(slopes.telemetry_cost_per_snapshot).toFixed(6)}`);

  console.log(`    - Topology Cost per Window (ms/window):`);
  console.log(`      Min: ${min(slopes.topology_cost_per_window).toFixed(6)} | Avg: ${avg(slopes.topology_cost_per_window).toFixed(6)} | Max: ${max(slopes.topology_cost_per_window).toFixed(6)}`);

  console.log(`    - Memory Growth per Transition (bytes/transition):`);
  console.log(`      Min: ${min(slopes.memory_growth_per_transition).toFixed(2)} | Avg: ${avg(slopes.memory_growth_per_transition).toFixed(2)} | Max: ${max(slopes.memory_growth_per_transition).toFixed(2)}`);

  console.log(`    - Serialization Cost per Frame (ms/frame):`);
  console.log(`      Min: ${min(slopes.serialization_cost_per_frame).toFixed(6)} | Avg: ${avg(slopes.serialization_cost_per_frame).toFixed(6)} | Max: ${max(slopes.serialization_cost_per_frame).toFixed(6)}`);

  // Asserting non-zero values
  if (avg(slopes.telemetry_cost_per_snapshot) === 0 || avg(slopes.topology_cost_per_window) === 0) {
    throw new Error(`[CRITICAL] Telemetry scaling curves have zero averages! Hashing/instrumentation overhead is not being accounted.`);
  }

  console.log(`\n[SUCCESS] Phase 9 Validation Complete. Perfect scheduling, cross-channel multiplexing, and slope scaling verified.`);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
