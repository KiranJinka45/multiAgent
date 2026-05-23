import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ReplayExecutionContract } from './dvk/harness/index.js';
import { ReplayQueueScheduler, ReplayPersistenceManager, SemanticProjector } from './dvk/harness/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('========================================================================');
console.log('   ZTAN Harness - Phase 14 Governance & Canonical Semantic Projection   ');
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

  // Use concurrency 2 to naturally build queue delay under intensive perturbation
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

    // Adjusting parameters to induce delay and test all scenarios
    if (i < 5) {
      // 1. Calibration runs (healthy, no pressure)
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
        jitter_intensity: 1.5,
        stdout_fragmentation: true,
        backpressure_intensity: 1.5,
        scheduler_contention: false,
        descriptor_exhaustion: false
      };
      flushInterval = 16;
    } else if (i < 22) {
      // 3. High Sabotage & Extreme Contention - Ultra-frequent flushing to spike queue delay
      entropyProfile = {
        async_chunk_jitter: true,
        jitter_intensity: 3.5,
        stdout_fragmentation: true,
        backpressure_intensity: 3.5,
        scheduler_contention: true,
        stderr_flood_intensity: 3.5,
        descriptor_exhaustion: true
      };
      flushInterval = 8;
    } else if (i < 26) {
      // 4. Sabotaged & Truncated runs to verify Archaeology Prioritization
      entropyProfile = {
        async_chunk_jitter: true,
        jitter_intensity: 4.5,
        stdout_fragmentation: true,
        backpressure_intensity: 4.5,
        partial_stdout_truncation: true,
        scheduler_contention: true,
        descriptor_exhaustion: true
      };
      flushInterval = 128;
    } else {
      // 5. Recovery Phase (Healthy runs under accumulated queue delay)
      entropyProfile = {
        async_chunk_jitter: false,
        stdout_fragmentation: false,
        scheduler_contention: false,
        descriptor_exhaustion: false
      };
      flushInterval = 64;
    }

    const contract: ReplayExecutionContract = {
      corpus_id: `${entry.corpus_id}_p14_t${i}`,
      deterministic_seed: `phase14_governance_t${i}`,
      runtime_pair: { primary: 'typescript', secondary: 'rust' },
      chunk_strategy: 'boundary_targeted',
      fragmentation_profile: { strategy: 'boundary_targeted' },
      snapshot_schema_version: 'v1.0',
      entropy_profile: entropyProfile,
      topology_flush_interval: flushInterval
    };

    const taskPromise = scheduler.schedule(contract, entry.payload).then(
      profile => {
        completedCount++;
        const primary = profile.primary_artifacts;
        const secondary = profile.secondary_artifacts;

        if (primary.infrastructure_failure === 'TIMEOUT' || secondary.infrastructure_failure === 'TIMEOUT') timeoutsCount++;
        if (primary.infrastructure_failure === 'PROCESS_CRASH' || secondary.infrastructure_failure === 'PROCESS_CRASH') crashesCount++;

        const currentPhase = scheduler.classifyCollapsePhase(timeoutsCount, crashesCount);
        
        // Retrieve the actual queue delay for this task execution
        const queueDelay = scheduler.queueDelays[scheduler.queueDelays.length - 1] || 0;

        // Configure persistence options for backpressure verification
        const persistOptions = {
          compress: true,
          batchThreshold: 1,
          retentionCeiling: 50,
          queueDelayMs: queueDelay,
          pressureCeilingMs: 1500, // Reduced threshold to reliably trigger shedded/sampled under concurrency
          enableAdaptiveShedding: true,
          enableTopologySampling: true,
        };

        // Save telemetry using persistence economics and backpressure rules
        ReplayPersistenceManager.saveProfile(profile, persistOptions);

        // Fetch latest saved record to inspect telemetry shedded/sampled flags
        const lastSavedProfiles = ReplayPersistenceManager.loadAllProfiles();
        const latestProfile = lastSavedProfiles[lastSavedProfiles.length - 1];
        const persistenceMetrics = latestProfile?.persistence_metrics || null;

        // Run post-hoc Semantic Projector check if healthy
        let projectorMatches = false;
        let tsRle = '';
        let rustRle = '';
        let projDetails = '';

        if (primary.final_result === 'accept' && secondary.final_result === 'accept') {
          try {
            const comparisonResult = SemanticProjector.compare(primary.snapshots, secondary.snapshots, entry.payload);
            projectorMatches = comparisonResult.isEqual;
            tsRle = comparisonResult.tsRle;
            rustRle = comparisonResult.rustRle;
            projDetails = comparisonResult.mismatchDetails || 'Perfect Equivalence';
          } catch (e: any) {
            projDetails = `Projector error: ${e.message}`;
          }
        }

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
          projectorMatches,
          tsRle,
          rustRle,
          projDetails,
          classification: profile.classification,
          persistence_metrics: persistenceMetrics,
          primary_snapshots_count: primary.snapshots.length,
          secondary_snapshots_count: secondary.snapshots.length,
          saved_primary_snapshots_count: latestProfile?.primary_artifacts?.snapshots?.length ?? 0,
          saved_secondary_snapshots_count: latestProfile?.secondary_artifacts?.snapshots?.length ?? 0,
        };

        campaignResults.push(resultRecord);

        console.log(`[Task ${completedCount}/${tasksCount}] Completed. ` +
          `QueueDelay: ${queueDelay.toFixed(1)}ms | ` +
          `Shedded: ${persistenceMetrics?.shedded} | Sampled: ${persistenceMetrics?.sampled} | ` +
          `Proj Parity: ${projectorMatches ? 'PASSED' : 'N/A (Sabotaged)'} | ` +
          `Class: ${profile.classification}`);

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
  
  scheduler.shutdown();
  console.log(`[+] Campaign completed.`);

  // Load all profiles from database to verify governance and ceilings
  const allSaved = ReplayPersistenceManager.loadAllProfiles();
  console.log(`\n[+] Persistence Database Verified. Saved Records: ${allSaved.length} profiles.`);

  // 1. BACKPRESSURE GOVERNANCE ANALYSIS
  console.log('\n========================================================================');
  console.log('              BACKPRESSURE GOVERNANCE ANALYSIS REPORT                   ');
  console.log('========================================================================');
  
  const sheddedTasks = campaignResults.filter(r => r.persistence_metrics?.shedded === true);
  const sampledTasks = campaignResults.filter(r => r.persistence_metrics?.sampled === true);
  const failureTasks = campaignResults.filter(r => 
    ['PROCESS_CRASH', 'TIMEOUT', 'MALFORMED_ARTIFACT', 'SNAPSHOT_OVERFLOW'].includes(r.classification)
  );

  console.log(`Adaptive Throttling Metrics:`);
  console.log(`  - Total shedded runs (high pressure):  ${sheddedTasks.length}`);
  for (const t of sheddedTasks.slice(0, 3)) {
    console.log(`    * Task ${t.index}: QueueDelay=${t.queueDelay.toFixed(1)}ms | Saved Primary Snapshots count = ${t.saved_primary_snapshots_count} (Expected 0)`);
  }
  
  console.log(`  - Total sampled runs (medium pressure): ${sampledTasks.length}`);
  for (const t of sampledTasks.slice(0, 3)) {
    console.log(`    * Task ${t.index}: QueueDelay=${t.queueDelay.toFixed(1)}ms | Raw Snapshots: ${t.primary_snapshots_count} -> Saved Snapshots: ${t.saved_primary_snapshots_count} (Expected ~1/8)`);
  }

  console.log(`  - Archaeology Prioritization Validation (Bypassing Throttling on Collapsed runs):`);
  console.log(`    * Total failed/collapsed runs identified: ${failureTasks.length}`);
  let prioritizationSuccess = true;
  for (const t of failureTasks) {
    if (t.persistence_metrics?.shedded || t.persistence_metrics?.sampled) {
      prioritizationSuccess = false;
    }
  }
  console.log(`    * Status: ${prioritizationSuccess ? 'PERFECT (Archaeology successfully exempted from shedding)' : 'FAILED (Throttling leaked into collapsed runs)'}`);

  // 2. RECURSION CEILING LIMIT VERIFICATION
  console.log('\n========================================================================');
  console.log('             OBSERVABILITY RECURSION CEILING VERIFICATION               ');
  console.log('========================================================================');
  console.log(`Current DB File Size: ${(fs.statSync(ReplayPersistenceManager['dbPath']).size / 1024).toFixed(2)} KB`);
  
  // Test ceiling suppression manually by creating a mock profile with a temporary database path
  const tempDbPath = path.join(process.cwd(), 'temp_recursion_test_db.json');
  ReplayPersistenceManager.setDbPath(tempDbPath);
  
  // Create a 11MB file to trigger the limit
  console.log(`[+] Simulating Recursion Ceiling by creating an 11MB dummy database...`);
  const largeBuffer = Buffer.alloc(11 * 1024 * 1024, 'A');
  fs.writeFileSync(tempDbPath, largeBuffer);
  
  const savedCountBefore = ReplayPersistenceManager.loadAllProfiles().length;
  console.log(`[+] Attempting to write a new profile when size >= 10MB...`);
  const mockProfile: any = campaignResults[0] ? campaignResults[0] : {};
  ReplayPersistenceManager.saveProfile(mockProfile, { compress: false });
  
  const savedCountAfter = ReplayPersistenceManager.loadAllProfiles().length;
  const ceilingVerified = savedCountBefore === savedCountAfter;
  
  console.log(`  - Suppressed successfully? ${ceilingVerified ? 'YES (Recursion limit active)' : 'NO (Telemetry leak detected)'}`);
  
  // Clean up
  try {
    fs.unlinkSync(tempDbPath);
    console.log(`[+] Cleaned up temporary test database.`);
  } catch {}
  
  // Restore default db path
  ReplayPersistenceManager.setDbPath(path.join(process.cwd(), 'replay_db.json'));

  // 3. CANONICAL SEMANTIC PROJECTION VERIFICATION
  console.log('\n========================================================================');
  console.log('          CANONICAL SEMANTIC PROJECTION PARITY ANALYSIS                 ');
  console.log('========================================================================');
  
  const healthyCompleted = campaignResults.filter(r => r.status === 'success' && r.projectorMatches === true);
  console.log(`  - Successfully validated runs:  ${healthyCompleted.length}`);
  if (healthyCompleted.length > 0) {
    const first = healthyCompleted[0];
    console.log(`  - Example Semantic Equivalence projection (Task ${first.index}):`);
    console.log(`    * TS RLE:   ${first.tsRle}`);
    console.log(`    * Rust RLE: ${first.rustRle}`);
    console.log(`    * Status:   ${first.projDetails}`);
  }

  const mismatchRuns = campaignResults.filter(r => r.status === 'success' && r.primary_status === 'accept' && r.secondary_status === 'accept' && r.projectorMatches === false);
  console.log(`  - Semantic mismatches found: ${mismatchRuns.length}`);
  if (mismatchRuns.length > 0) {
    for (const r of mismatchRuns) {
      console.log(`    * Task ${r.index} failed equivalence: ${r.projDetails}`);
    }
  }

  console.log('\n==================== SCHEDULER DERIVATIVES REPORT ====================');
  console.log(`Queue Acceleration:          ${scheduler.getQueueAcceleration().toFixed(4)} ms/task^2`);
  console.log(`Drain Latency Acceleration:  ${scheduler.getDrainLatencyAcceleration().toFixed(4)} ms/task^2`);
  console.log(`Variance Growth Rate:        ${scheduler.getVarianceGrowthRate().toFixed(4)} ms^2/task`);
  console.log(`Memory Growth Rate:          ${scheduler.getMemoryGrowthRate().toFixed(4)} bytes/task`);
  console.log(`Memory Acceleration:         ${scheduler.getMemoryAcceleration().toFixed(4)} bytes/task^2`);
  console.log(`Replay Recovery Half-Life:   ${scheduler.recoveryHalfLifeMs} ms`);

  console.log('\n[SUCCESS] Phase 14 Validation Campaign Run Complete.');
}

run().catch(err => {
  console.error('Fatal run error:', err);
  process.exit(1);
});
