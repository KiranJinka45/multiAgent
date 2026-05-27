import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ReplayExecutionContract } from './dvk/harness/index.js';
import { ReplayQueueScheduler, ReplayPersistenceManager } from './dvk/harness/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('========================================================================');
console.log('   ZTAN Harness - Phase 13 Degradation Economics & Morphology Mapping  ');
console.log('========================================================================');

const corpusPath = path.join(__dirname, 'dvk/corpus/corpus_cadence.json');
if (!fs.existsSync(corpusPath)) {
  console.error(`Error: Cadence corpus not found at ${corpusPath}`);
  process.exit(1);
}

const pathologies = JSON.parse(fs.readFileSync(corpusPath, 'utf8'));

async function run() {
  const entry = pathologies[0];
  console.log(`\n[+] Pathology payload loaded: ${entry.provenance.intended_pathology} (${entry.payload.length} bytes)`);

  // Clear previous DB
  ReplayPersistenceManager.clear();
  console.log(`[+] Cleared database file 'replay_db.json'`);

  // Use concurrency 2 to induce queue latency and scheduler scheduling delays
  const scheduler = new ReplayQueueScheduler(2);
  const tasksCount = 30;

  console.log(`[+] Initializing ReplayQueueScheduler (Concurrency Pool Size: 2)`);
  console.log(`[+] Queueing ${tasksCount} tasks with varying sabotage & flushing configurations...`);

  const promises = [];
  let completedCount = 0;
  let timeoutsCount = 0;
  let crashesCount = 0;

  const campaignResults: any[] = [];

  for (let i = 0; i < tasksCount; i++) {
    let entropyProfile: any = {};
    let flushInterval = 64; // Default

    if (i < 5) {
      // 1. Calibration runs (healthy)
      entropyProfile = {
        async_chunk_jitter: false,
        stdout_fragmentation: false,
        scheduler_contention: false,
        descriptor_exhaustion: false
      };
      flushInterval = 64;
    } else if (i < 12) {
      // 2. Medium Sabotage (Jitter & Backpressure) - Small flush interval
      entropyProfile = {
        async_chunk_jitter: true,
        jitter_intensity: 1.0,
        stdout_fragmentation: true,
        backpressure_intensity: 1.2,
        scheduler_contention: false,
        descriptor_exhaustion: false
      };
      flushInterval = 16;
    } else if (i < 20) {
      // 3. High Sabotage (Contention & FD Exhaustion) - Ultra-frequent flushing
      entropyProfile = {
        async_chunk_jitter: true,
        jitter_intensity: 2.0,
        stdout_fragmentation: true,
        backpressure_intensity: 2.0,
        scheduler_contention: true,
        stderr_flood_intensity: 2.0,
        descriptor_exhaustion: true
      };
      flushInterval = 8;
    } else if (i < 25) {
      // 4. Extreme Sabotage & Truncation - Lazy/large flush interval to test recovery loss severity
      entropyProfile = {
        async_chunk_jitter: true,
        jitter_intensity: 3.5,
        stdout_fragmentation: true,
        backpressure_intensity: 3.5,
        partial_stdout_truncation: true,
        scheduler_contention: true,
        descriptor_exhaustion: true
      };
      flushInterval = 128;
    } else {
      // 5. Recovery Phase
      entropyProfile = {
        async_chunk_jitter: false,
        stdout_fragmentation: false,
        scheduler_contention: false,
        descriptor_exhaustion: false
      };
      flushInterval = 64;
    }

    const contract: ReplayExecutionContract = {
      corpus_id: `${entry.corpus_id}_p13_t${i}`,
      deterministic_seed: `phase13_degrad_t${i}`,
      runtime_pair: { primary: 'typescript', secondary: 'rust' },
      chunk_strategy: 'boundary_targeted',
      fragmentation_profile: { strategy: 'boundary_targeted' },
      snapshot_schema_version: 'v1.0',
      entropy_profile: entropyProfile,
      topology_flush_interval: flushInterval
    };

    // Determine persistence options per task
    // Tasks 0 to 14: no compression, immediate save
    // Tasks 15 to 29: compression enabled, batched (batchThreshold = 5), retention ceiling 50
    const persistOptions = i < 15 
      ? { compress: false, batchThreshold: 1, retentionCeiling: 50 }
      : { compress: true, batchThreshold: 5, retentionCeiling: 50 };

    const taskPromise = scheduler.schedule(contract, entry.payload).then(
      profile => {
        completedCount++;
        const primary = profile.primary_artifacts;
        const secondary = profile.secondary_artifacts;

        if (primary.infrastructure_failure === 'TIMEOUT' || secondary.infrastructure_failure === 'TIMEOUT') timeoutsCount++;
        if (primary.infrastructure_failure === 'PROCESS_CRASH' || secondary.infrastructure_failure === 'PROCESS_CRASH') crashesCount++;

        const currentPhase = scheduler.classifyCollapsePhase(timeoutsCount, crashesCount);
        const queueDelay = scheduler.queueDelays[scheduler.queueDelays.length - 1];

        // Save telemetry using persistence economics
        ReplayPersistenceManager.saveProfile(profile, persistOptions);

        // Fetch latest saved record to inspect compression metrics (if immediate write was performed)
        const lastSavedProfiles = ReplayPersistenceManager.loadAllProfiles();
        const latestProfile = lastSavedProfiles[lastSavedProfiles.length - 1];
        const persistenceMetrics = latestProfile?.persistence_metrics || null;

        const resultRecord = {
          index: i,
          entropyProfile,
          flushInterval,
          status: 'success',
          phase: currentPhase,
          queueDelay,
          primary_status: primary.final_result,
          secondary_status: secondary.final_result,
          primary_failure: primary.infrastructure_failure || 'NONE',
          secondary_failure: secondary.infrastructure_failure || 'NONE',
          primary_digest: primary.trace_digest,
          secondary_digest: secondary.trace_digest,
          primary_recovered_snaps: primary.infrastructure_failure_metadata?.partial_snapshots_recovered || 0,
          secondary_recovered_snaps: secondary.infrastructure_failure_metadata?.partial_snapshots_recovered || 0,
          primary_loss_severity: primary.infrastructure_failure_metadata?.topology_loss_severity ?? 0,
          secondary_loss_severity: secondary.infrastructure_failure_metadata?.topology_loss_severity ?? 0,
          primary_snapshots: primary.snapshots,
          secondary_snapshots: secondary.snapshots,
          persistence_metrics: persistenceMetrics,
          primary_overhead_ms: primary.metrics?.telemetry_overhead_ms || 0,
          secondary_overhead_ms: secondary.metrics?.telemetry_overhead_ms || 0,
        };

        campaignResults.push(resultRecord);

        console.log(`[Task ${completedCount}/${tasksCount}] Completed. ` +
          `FlushInt: ${flushInterval} | QueueDelay: ${queueDelay.toFixed(1)}ms | ` +
          `Primary: ${primary.final_result} (${primary.infrastructure_failure || 'OK'}), ` +
          `Secondary: ${secondary.final_result} (${secondary.infrastructure_failure || 'OK'}) | ` +
          `Phase: ${currentPhase}`);

        return { status: 'success', profile };
      },
      err => {
        completedCount++;
        crashesCount++;
        const currentPhase = scheduler.classifyCollapsePhase(timeoutsCount, crashesCount);
        console.log(`[Task ${completedCount}/${tasksCount}] Errored. Phase: ${currentPhase}`);

        campaignResults.push({
          index: i,
          entropyProfile,
          flushInterval,
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
  
  // Flush any final batched persistence entries
  console.log(`[+] Flushing any remaining buffered telemetry...`);
  ReplayPersistenceManager.flush(50);
  
  scheduler.shutdown();
  console.log(`[+] Campaign completed.`);

  // Load all profiles from database to verify batching and retention ceilings
  const allSaved = ReplayPersistenceManager.loadAllProfiles();
  console.log(`\n[+] Persistence Database Verified. Saved Records: ${allSaved.length} profiles.`);

  // 1. Cross-Runtime delay scaling heatmap
  console.log('\n========================================================================');
  console.log('           CROSS-RUNTIME QUEUE DELAY SCALING HEATMAP                    ');
  console.log('========================================================================');
  console.log(' Sabotage Level  | Average Queue Delay (ms) | ASCII Scaling Gradient    ');
  console.log('-----------------+--------------------------+---------------------------');
  
  const groups = [
    { name: 'None (0-4)     ', indices: [0, 1, 2, 3, 4] },
    { name: 'Medium (5-11)  ', indices: [5, 6, 7, 8, 9, 10, 11] },
    { name: 'High (12-19)   ', indices: [12, 13, 14, 15, 16, 17, 18, 19] },
    { name: 'Extreme (20-24)', indices: [20, 21, 22, 23, 24] },
    { name: 'Recovery (25-29)', indices: [25, 26, 27, 28, 29] }
  ];

  for (const g of groups) {
    const records = campaignResults.filter(r => g.indices.includes(r.index) && r.status === 'success');
    const avgDelay = records.length > 0 
      ? records.reduce((sum, r) => sum + r.queueDelay, 0) / records.length
      : 0;
    
    // Choose character based on delay
    let bars = '';
    const barCount = Math.min(25, Math.ceil(avgDelay / 100));
    if (avgDelay < 50) {
      bars = '█'.repeat(Math.max(1, barCount)) + '░'.repeat(25 - barCount);
    } else if (avgDelay < 300) {
      bars = '▓'.repeat(barCount) + '░'.repeat(25 - barCount);
    } else if (avgDelay < 1000) {
      bars = '▒'.repeat(barCount) + '░'.repeat(25 - barCount);
    } else {
      bars = '▓'.repeat(barCount) + '░'.repeat(25 - barCount);
    }

    console.log(` ${g.name} | ${avgDelay.toFixed(2).padStart(24)} ms | [${bars}]`);
  }

  // 2. Persistence Economics Report
  console.log('\n========================================================================');
  console.log('                  PERSISTENCE ECONOMICS ANALYSIS                        ');
  console.log('========================================================================');
  const compressedTasks = allSaved.filter(p => p.persistence_metrics && p.persistence_metrics.compressed_bytes > 0);
  const rawTasks = allSaved.filter(p => p.persistence_metrics && p.persistence_metrics.compressed_bytes === 0);

  const avgRawBytes = compressedTasks.reduce((sum, p) => sum + p.persistence_metrics.raw_bytes, 0) / (compressedTasks.length || 1);
  const avgCompBytes = compressedTasks.reduce((sum, p) => sum + p.persistence_metrics.compressed_bytes, 0) / (compressedTasks.length || 1);
  const avgRatio = compressedTasks.reduce((sum, p) => sum + p.persistence_metrics.compression_ratio, 0) / (compressedTasks.length || 1);
  const avgCompTime = compressedTasks.reduce((sum, p) => sum + p.persistence_metrics.processing_time_ms, 0) / (compressedTasks.length || 1);
  const avgRawTime = rawTasks.reduce((sum, p) => sum + p.persistence_metrics.processing_time_ms, 0) / (rawTasks.length || 1);

  console.log(`Compressed Telemetry Groups (Tasks 15-29):`);
  console.log(`  - Average Raw Snapshot Size:      ${avgRawBytes.toFixed(0)} bytes`);
  console.log(`  - Average Compressed Size:        ${avgCompBytes.toFixed(0)} bytes`);
  console.log(`  - Average Compression Ratio:      ${avgRatio.toFixed(2)}x (Write Amplification Reduction: ${((1 - 1/avgRatio)*100).toFixed(1)}%)`);
  console.log(`  - Average Compression CPU Time:   ${avgCompTime.toFixed(4)} ms`);
  console.log(`Raw Telemetry Groups (Tasks 0-14):`);
  console.log(`  - Average Raw Write CPU Time:      ${avgRawTime.toFixed(4)} ms`);
  console.log(`  - CPU Overhead of Compression:     ${(avgCompTime - avgRawTime).toFixed(4)} ms`);

  // 3. Adaptive Flush Interval Optimization
  console.log('\n========================================================================');
  console.log('             ADAPTIVE FLUSH INTERVAL SENSITIVITY                        ');
  console.log('========================================================================');
  // Compare flushInterval = 8 (Tasks 12-19) vs flushInterval = 128 (Tasks 20-24)
  const f8 = campaignResults.filter(r => r.flushInterval === 8 && r.status === 'success');
  const f128 = campaignResults.filter(r => r.flushInterval === 128 && r.status === 'success');

  const tsLoss8 = f8.reduce((sum, r) => sum + r.primary_loss_severity, 0) / (f8.length || 1);
  const rustLoss8 = f8.reduce((sum, r) => sum + r.secondary_loss_severity, 0) / (f8.length || 1);
  const tsRec8 = f8.reduce((sum, r) => sum + r.primary_recovered_snaps, 0) / (f8.length || 1);
  const rustRec8 = f8.reduce((sum, r) => sum + r.secondary_recovered_snaps, 0) / (f8.length || 1);

  const tsLoss128 = f128.reduce((sum, r) => sum + r.primary_loss_severity, 0) / (f128.length || 1);
  const rustLoss128 = f128.reduce((sum, r) => sum + r.secondary_loss_severity, 0) / (f128.length || 1);
  const tsRec128 = f128.reduce((sum, r) => sum + r.primary_recovered_snaps, 0) / (f128.length || 1);
  const rustRec128 = f128.reduce((sum, r) => sum + r.secondary_recovered_snaps, 0) / (f128.length || 1);

  const tsOverhead8 = f8.reduce((sum, r) => sum + r.primary_overhead_ms, 0) / (f8.length || 1);
  const rustOverhead8 = f8.reduce((sum, r) => sum + r.secondary_overhead_ms, 0) / (f8.length || 1);
  const tsOverhead128 = f128.reduce((sum, r) => sum + r.primary_overhead_ms, 0) / (f128.length || 1);
  const rustOverhead128 = f128.reduce((sum, r) => sum + r.secondary_overhead_ms, 0) / (f128.length || 1);

  console.log(`Flush Interval = 8 (Ultra-Frequent Flushing, High Sabotage):`);
  console.log(`  - TS Recovery Count:      ${tsRec8.toFixed(1)} snaps | Loss Severity: ${tsLoss8.toFixed(3)} | Overhead: ${tsOverhead8.toFixed(2)} ms`);
  console.log(`  - Rust Recovery Count:    ${rustRec8.toFixed(1)} snaps | Loss Severity: ${rustLoss8.toFixed(3)} | Overhead: ${rustOverhead8.toFixed(2)} ms`);
  console.log(`Flush Interval = 128 (Lazy/Infrequent Flushing, Extreme Sabotage):`);
  console.log(`  - TS Recovery Count:      ${tsRec128.toFixed(1)} snaps | Loss Severity: ${tsLoss128.toFixed(3)} | Overhead: ${tsOverhead128.toFixed(2)} ms`);
  console.log(`  - Rust Recovery Count:    ${rustRec128.toFixed(1)} snaps | Loss Severity: ${rustLoss128.toFixed(3)} | Overhead: ${rustOverhead128.toFixed(2)} ms`);

  // 4. Semantic Drift under Collapse Validation
  console.log('\n========================================================================');
  console.log('             SEMANTIC DRIFT UNDER COLLAPSE VALIDATION                   ');
  console.log('========================================================================');
  let nonTruncatedChecked = 0;
  let nonTruncatedDrifts = 0;
  let truncatedChecked = 0;
  let truncatedDrifts = 0;

  for (const r of campaignResults) {
    if (r.status !== 'success') continue;
    if (r.primary_status === 'accept' && r.secondary_status === 'accept') {
      nonTruncatedChecked++;
      if (r.primary_digest !== r.secondary_digest) {
        nonTruncatedDrifts++;
      }
    } else {
      // Truncated or errored runs. Verify that overlapping prefixes of recovered snapshot hashes match.
      truncatedChecked++;
      const minLen = Math.min(r.primary_snapshots.length, r.secondary_snapshots.length);
      let mismatch = false;
      for (let sIdx = 0; sIdx < minLen; sIdx++) {
        if (r.primary_snapshots[sIdx].hash !== r.secondary_snapshots[sIdx].hash) {
          mismatch = true;
          break;
        }
      }
      if (mismatch) {
        truncatedDrifts++;
      }
    }
  }

  console.log(`Healthy State (Non-Truncated):`);
  console.log(`  - Comparisons Checked:     ${nonTruncatedChecked}`);
  console.log(`  - Semantic Drift Detected:  ${nonTruncatedDrifts}`);
  console.log(`Collapse State (Truncated):`);
  console.log(`  - Comparisons Checked:     ${truncatedChecked}`);
  console.log(`  - Semantic Drift Detected:  ${truncatedDrifts}`);

  console.log(`\n==================== SCHEDULER DERIVATIVES REPORT ====================`);
  console.log(`Queue Acceleration:          ${scheduler.getQueueAcceleration().toFixed(4)} ms/task^2`);
  console.log(`Drain Latency Acceleration:  ${scheduler.getDrainLatencyAcceleration().toFixed(4)} ms/task^2`);
  console.log(`Variance Growth Rate:        ${scheduler.getVarianceGrowthRate().toFixed(4)} ms^2/task`);
  console.log(`Memory Growth Rate:          ${scheduler.getMemoryGrowthRate().toFixed(4)} bytes/task`);
  console.log(`Memory Acceleration:         ${scheduler.getMemoryAcceleration().toFixed(4)} bytes/task^2`);
  console.log(`Replay Recovery Half-Life:   ${scheduler.recoveryHalfLifeMs} ms`);

  console.log('\n[SUCCESS] Phase 13 Validation Campaign Run Complete.');
}

run().catch(err => {
  console.error('Fatal run error:', err);
  process.exit(1);
});
