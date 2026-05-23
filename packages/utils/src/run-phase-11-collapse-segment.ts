import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ReplayExecutionContract, ReplayTelemetryProfile } from './dvk/harness/index.js';
import { ReplayQueueScheduler, RuntimePairExecutor } from './dvk/harness/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('========================================================================');
console.log('   ZTAN Harness - Phase 11 Orchestration Degradation Science           ');
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

  // Pool size of 2 to ensure queue buildup and saturation
  const scheduler = new ReplayQueueScheduler(2);
  const tasksCount = 40;

  console.log(`[+] Initializing ReplayQueueScheduler (Concurrency Pool Size: 2)`);
  console.log(`[+] Queueing ${tasksCount} tasks with progressive load to trace collapse segments...`);

  const promises = [];
  let completedCount = 0;
  let timeoutsCount = 0;
  let crashesCount = 0;

  // Track phase logs
  const phaseLog: string[] = [];

  for (let i = 0; i < tasksCount; i++) {
    let entropyProfile = {};

    if (i < 5) {
      // Stable Phase: No sabotage
      entropyProfile = {
        async_chunk_jitter: false,
        stdout_fragmentation: false,
        scheduler_contention: false
      };
    } else if (i < 15) {
      // Pressured Phase: Moderate jitter
      entropyProfile = {
        async_chunk_jitter: true,
        jitter_intensity: 0.5,
        stdout_fragmentation: true,
        backpressure_intensity: 0.5,
        scheduler_contention: false
      };
    } else if (i < 25) {
      // Saturated & Destabilizing Phase: Extreme backpressure and contention
      entropyProfile = {
        async_chunk_jitter: true,
        jitter_intensity: 2.0,
        stdout_fragmentation: true,
        backpressure_intensity: 2.0,
        scheduler_contention: true,
        stderr_flood_intensity: 2.0
      };
    } else if (i < 30) {
      // Collapse Phase: Induce truncation and high latency
      entropyProfile = {
        async_chunk_jitter: true,
        jitter_intensity: 3.0,
        stdout_fragmentation: true,
        backpressure_intensity: 3.0,
        partial_stdout_truncation: true, // Will fail
        scheduler_contention: true
      };
    } else {
      // Recovery Phase: Gradually ease pressure to allow backlog draining
      entropyProfile = {
        async_chunk_jitter: false,
        stdout_fragmentation: false,
        scheduler_contention: false
      };
    }

    const contract: ReplayExecutionContract = {
      corpus_id: `${entry.corpus_id}_p11_t${i}`,
      deterministic_seed: `phase11_collapse_t${i}`,
      runtime_pair: { primary: 'typescript', secondary: 'typescript' },
      chunk_strategy: 'boundary_targeted',
      fragmentation_profile: { strategy: 'boundary_targeted' },
      snapshot_schema_version: 'v1.0',
      entropy_profile: entropyProfile
    };

    const taskPromise = scheduler.schedule(contract, entry.payload).then(
      profile => {
        completedCount++;
        const primary = profile.primary_artifacts;
        if (primary.infrastructure_failure === 'TIMEOUT') timeoutsCount++;
        if (primary.infrastructure_failure === 'PROCESS_CRASH') crashesCount++;

        // Live state logging
        const currentPhase = scheduler.classifyCollapsePhase(timeoutsCount, crashesCount);
        phaseLog.push(currentPhase);

        console.log(`[Task ${completedCount}/${tasksCount}] Completed. ` +
          `Queue delay: ${scheduler.queueDelays[scheduler.queueDelays.length - 1].toFixed(1)}ms | ` +
          `Event loop max lag: ${scheduler.maxEventLoopBlockTime}ms | ` +
          `Phase: ${currentPhase}`);

        return { status: 'success', profile, index: i };
      },
      err => {
        completedCount++;
        crashesCount++;
        const currentPhase = scheduler.classifyCollapsePhase(timeoutsCount, crashesCount);
        phaseLog.push(currentPhase);
        
        console.log(`[Task ${completedCount}/${tasksCount}] Erored. Phase: ${currentPhase}`);
        return { status: 'error', error: err, index: i };
      }
    );

    promises.push(taskPromise);
  }

  console.log(`[+] Executing tasks concurrently...`);
  const results = await Promise.all(promises);
  scheduler.shutdown();
  console.log(`[+] Campaigns finalized.`);

  // Process results
  let successRuns = 0;
  let truncatedRuns = 0;
  let timeoutRuns = 0;
  let otherFailures = 0;
  
  const recoveredLineages: any[] = [];

  for (const res of results) {
    if (res.status === 'success') {
      const successRes = res as { status: 'success'; profile: ReplayTelemetryProfile; index: number };
      const primary = successRes.profile.primary_artifacts;
      if (primary.final_result === 'accept') {
        successRuns++;
      } else if (primary.infrastructure_failure === 'MALFORMED_ARTIFACT') {
        truncatedRuns++;
        if (primary.infrastructure_failure_metadata) {
          recoveredLineages.push({
            index: successRes.index,
            metadata: primary.infrastructure_failure_metadata
          });
        }
      } else if (primary.infrastructure_failure === 'TIMEOUT') {
        timeoutRuns++;
      } else {
        otherFailures++;
      }
    } else {
      otherFailures++;
    }
  }

  console.log('\n=================== DEGRADATION ARCHAEOLOGY REPORT ===================');
  console.log(`Total Scheduled Tasks:            ${tasksCount}`);
  console.log(`Successful Runs:                  ${successRuns}`);
  console.log(`Expected Truncated Runs:          ${truncatedRuns}`);
  console.log(`Timeout Runs:                     ${timeoutRuns}`);
  console.log(`Other Orchestrator Failures:      ${otherFailures}`);

  console.log('\n[+] Second-Order Collapse Derivatives:');
  console.log(`    - Queue Acceleration:          ${scheduler.getQueueAcceleration().toFixed(4)} ms/task^2`);
  console.log(`    - Drain Latency Acceleration:  ${scheduler.getDrainLatencyAcceleration().toFixed(4)} ms/task^2`);
  console.log(`    - Variance Growth Rate:        ${scheduler.getVarianceGrowthRate().toFixed(4)} ms^2/task`);
  console.log(`    - Replay Recovery Half-Life:   ${scheduler.recoveryHalfLifeMs} ms`);

  console.log('\n[+] Collapse-Phase Segmentation Sequence:');
  // De-duplicate sequence print to show transitions
  const uniqueTransitions: string[] = [];
  for (const phase of phaseLog) {
    if (uniqueTransitions.length === 0 || uniqueTransitions[uniqueTransitions.length - 1] !== phase) {
      uniqueTransitions.push(phase);
    }
  }
  console.log(`    Sequence: ${uniqueTransitions.join(' -> ')}`);

  console.log('\n[+] Replay Abandonment Lineage Archaeology (Sample Recovered Fragments):');
  if (recoveredLineages.length > 0) {
    const sample = recoveredLineages[0];
    const meta = sample.metadata;
    console.log(`    - Target Task Index:           ${sample.index}`);
    console.log(`    - Partial Snapshots Recovered: ${meta.partial_snapshots_recovered ?? 0}`);
    console.log(`    - Last Sequence Index:         ${meta.last_sequence_index ?? -1}`);
    console.log(`    - Recovered Topology Windows:  ${meta.partial_topology_windows ? Object.keys(meta.partial_topology_windows).length : 0} segments`);
    if (meta.partial_topology_windows) {
      console.log(`      Keys: ${JSON.stringify(Object.keys(meta.partial_topology_windows))}`);
    }
  } else {
    console.log('    - No truncated lineage segments were recovered.');
  }

  console.log('\n[SUCCESS] Phase 11 Validation Complete.');
}

run().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
