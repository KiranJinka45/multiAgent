import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ReplayExecutionContract, ReplayTelemetryProfile } from './dvk/harness/index.js';
import { ReplayQueueScheduler, RuntimePairExecutor, ReplayPersistenceManager } from './dvk/harness/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('========================================================================');
console.log('   ZTAN Harness - Phase 12 Cross-Runtime Cadence & Archaeology         ');
console.log('========================================================================');

const corpusPath = path.join(__dirname, 'dvk/corpus/corpus_cadence.json');
if (!fs.existsSync(corpusPath)) {
  console.error(`Error: Cadence corpus not found at ${corpusPath}`);
  process.exit(1);
}

const pathologies = JSON.parse(fs.readFileSync(corpusPath, 'utf8'));

async function run() {
  // Select first entry for standard runs
  const entry = pathologies[0];
  console.log(`\n[+] Pathology payload loaded: ${entry.provenance.intended_pathology} (${entry.payload.length} bytes)`);

  // Clear previous DB
  ReplayPersistenceManager.clear();
  console.log(`[+] Cleared database file 'replay_db.json'`);

  // Use concurrency 2 to test scheduling contention
  const scheduler = new ReplayQueueScheduler(2);
  const tasksCount = 30;

  console.log(`[+] Initializing ReplayQueueScheduler (Concurrency Pool Size: 2)`);
  console.log(`[+] Queueing ${tasksCount} tasks with varying sabotage configurations...`);

  const promises = [];
  let completedCount = 0;
  let timeoutsCount = 0;
  let crashesCount = 0;

  const instabilityMap: any[] = [];

  for (let i = 0; i < tasksCount; i++) {
    let entropyProfile: any = {};

    if (i < 5) {
      // 1. Calibration runs (first 5 runs must be stable to calibrate baselines)
      entropyProfile = {
        async_chunk_jitter: false,
        stdout_fragmentation: false,
        scheduler_contention: false,
        descriptor_exhaustion: false
      };
    } else if (i < 12) {
      // 2. Jitter and Backpressure pressure
      entropyProfile = {
        async_chunk_jitter: true,
        jitter_intensity: 1.0,
        stdout_fragmentation: true,
        backpressure_intensity: 1.2,
        scheduler_contention: false,
        descriptor_exhaustion: false
      };
    } else if (i < 20) {
      // 3. Concurrency Contention and FD Exhaustion
      entropyProfile = {
        async_chunk_jitter: true,
        jitter_intensity: 2.0,
        stdout_fragmentation: true,
        backpressure_intensity: 2.0,
        scheduler_contention: true,
        stderr_flood_intensity: 2.5,
        descriptor_exhaustion: true
      };
    } else if (i < 25) {
      // 4. Force Truncation and Collapse
      entropyProfile = {
        async_chunk_jitter: true,
        jitter_intensity: 3.5,
        stdout_fragmentation: true,
        backpressure_intensity: 3.5,
        partial_stdout_truncation: true,
        scheduler_contention: true,
        descriptor_exhaustion: true
      };
    } else {
      // 5. Recovery phase
      entropyProfile = {
        async_chunk_jitter: false,
        stdout_fragmentation: false,
        scheduler_contention: false,
        descriptor_exhaustion: false
      };
    }

    const contract: ReplayExecutionContract = {
      corpus_id: `${entry.corpus_id}_p12_t${i}`,
      deterministic_seed: `phase12_cross_t${i}`,
      // Cross-runtime validation: typescript vs rust!
      runtime_pair: { primary: 'typescript', secondary: 'rust' },
      chunk_strategy: 'boundary_targeted',
      fragmentation_profile: { strategy: 'boundary_targeted' },
      snapshot_schema_version: 'v1.0',
      entropy_profile: entropyProfile
    };

    const taskPromise = scheduler.schedule(contract, entry.payload).then(
      profile => {
        completedCount++;
        const primary = profile.primary_artifacts;
        const secondary = profile.secondary_artifacts;

        if (primary.infrastructure_failure === 'TIMEOUT' || secondary.infrastructure_failure === 'TIMEOUT') timeoutsCount++;
        if (primary.infrastructure_failure === 'PROCESS_CRASH' || secondary.infrastructure_failure === 'PROCESS_CRASH') crashesCount++;

        const currentPhase = scheduler.classifyCollapsePhase(timeoutsCount, crashesCount);
        
        // Log to instability map
        instabilityMap.push({
          index: i,
          entropyProfile,
          status: 'success',
          phase: currentPhase,
          primary_status: primary.final_result,
          secondary_status: secondary.final_result,
          primary_failure: primary.infrastructure_failure || 'NONE',
          secondary_failure: secondary.infrastructure_failure || 'NONE',
          primary_recovered_snaps: primary.infrastructure_failure_metadata?.partial_snapshots_recovered || 0,
          secondary_recovered_snaps: secondary.infrastructure_failure_metadata?.partial_snapshots_recovered || 0,
          primary_loss_severity: primary.infrastructure_failure_metadata?.topology_loss_severity ?? 0,
          secondary_loss_severity: secondary.infrastructure_failure_metadata?.topology_loss_severity ?? 0
        });

        // Persist profile
        ReplayPersistenceManager.saveProfile(profile);

        console.log(`[Task ${completedCount}/${tasksCount}] Completed. ` +
          `Queue delay: ${scheduler.queueDelays[scheduler.queueDelays.length - 1].toFixed(1)}ms | ` +
          `Primary: ${primary.final_result} (${primary.infrastructure_failure || 'OK'}), ` +
          `Secondary: ${secondary.final_result} (${secondary.infrastructure_failure || 'OK'}) | ` +
          `Phase: ${currentPhase}`);

        return { status: 'success', profile };
      },
      err => {
        completedCount++;
        crashesCount++;
        const currentPhase = scheduler.classifyCollapsePhase(timeoutsCount, crashesCount);
        console.log(`[Task ${completedCount}/${tasksCount}] Erored. Phase: ${currentPhase}`);

        instabilityMap.push({
          index: i,
          entropyProfile,
          status: 'error',
          phase: currentPhase,
          error: err.message
        });

        return { status: 'error', error: err };
      }
    );

    promises.push(taskPromise);
  }

  console.log(`[+] Running tasks concurrently...`);
  await Promise.all(promises);
  scheduler.shutdown();
  console.log(`[+] Campaigns completed.`);

  // Load persisted db profiles to verify persistence
  const persistedProfiles = ReplayPersistenceManager.loadAllProfiles();
  console.log(`\n[+] Persistence Database contains: ${persistedProfiles.length} records.`);

  // Draw Cross-Runtime Cadence Instability Map
  console.log('\n========================================================================');
  console.log('                  CROSS-RUNTIME CADENCE INSTABILITY MAP                 ');
  console.log('========================================================================');
  console.log('Index | Phase          | Primary (TS)   | Secondary (Rust) | Sabotage Config');
  console.log('------------------------------------------------------------------------');
  for (const item of instabilityMap) {
    if (item.status === 'error') {
      console.log(`${String(item.index).padEnd(5)} | ${item.phase.padEnd(14)} | ERROR (${String(item.error).substring(0, 10)})`);
      continue;
    }
    const primStr = item.primary_status === 'accept' ? 'ACCEPT' : `ERR (${item.primary_failure})`;
    const secStr = item.secondary_status === 'accept' ? 'ACCEPT' : `ERR (${item.secondary_failure})`;
    
    let sabotageDesc = 'None';
    if (item.entropyProfile.descriptor_exhaustion) {
      sabotageDesc = 'Jitter+Backpressure+FD';
    } else if (item.entropyProfile.async_chunk_jitter) {
      sabotageDesc = 'Jitter+Backpressure';
    }

    console.log(
      `${String(item.index).padEnd(5)} | ` +
      `${item.phase.padEnd(14)} | ` +
      `${primStr.padEnd(14)} | ` +
      `${secStr.padEnd(16)} | ` +
      `${sabotageDesc}`
    );
  }

  // Display second-order derivatives and memory metrics
  console.log('\n==================== SCHEDULER DERIVATIVES REPORT ====================');
  console.log(`Queue Acceleration:          ${scheduler.getQueueAcceleration().toFixed(4)} ms/task^2`);
  console.log(`Drain Latency Acceleration:  ${scheduler.getDrainLatencyAcceleration().toFixed(4)} ms/task^2`);
  console.log(`Variance Growth Rate:        ${scheduler.getVarianceGrowthRate().toFixed(4)} ms^2/task`);
  console.log(`Memory Growth Rate:          ${scheduler.getMemoryGrowthRate().toFixed(4)} bytes/task`);
  console.log(`Memory Acceleration:         ${scheduler.getMemoryAcceleration().toFixed(4)} bytes/task^2`);
  console.log(`Replay Recovery Half-Life:   ${scheduler.recoveryHalfLifeMs} ms`);

  // Print recovered lineage examples
  console.log('\n================= TELEMETRY ARCHEOLOGY EXTRACTS =================');
  const recoveryRecords = instabilityMap.filter(item => 
    item.status === 'success' && 
    (item.primary_recovered_snaps > 0 || item.secondary_recovered_snaps > 0)
  );

  if (recoveryRecords.length > 0) {
    const sample = recoveryRecords[0];
    console.log(`Task Index:                  ${sample.index}`);
    console.log(`Primary (TS) recovered:      ${sample.primary_recovered_snaps} snaps (Loss Severity: ${sample.primary_loss_severity.toFixed(2)})`);
    console.log(`Secondary (Rust) recovered:  ${sample.secondary_recovered_snaps} snaps (Loss Severity: ${sample.secondary_loss_severity.toFixed(2)})`);
  } else {
    console.log('No partial telemetry recovery triggered (increase truncation intensity to see lineage recovery).');
  }

  console.log('\n[SUCCESS] Phase 12 Validation Campaign Run Complete.');
}

run().catch(err => {
  console.error('Fatal run error:', err);
  process.exit(1);
});
