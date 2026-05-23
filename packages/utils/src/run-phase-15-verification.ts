import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ReplayExecutionContract } from './dvk/harness/index.js';
import { ReplayQueueScheduler, ReplayPersistenceManager, SemanticObjectProjector } from './dvk/harness/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('========================================================================');
console.log('   ZTAN Harness - Phase 15 Parity, AST Equivalence & Archaeology    ');
console.log('========================================================================');

const targetDbPath = path.join(process.cwd(), 'replay_db.json');
ReplayPersistenceManager.setDbPath(targetDbPath);

// Clear previous DB
ReplayPersistenceManager.clear();
console.log(`[+] Cleared database file 'replay_db.json'`);

// 1. Payloads covering required Phase 15 conditions
const testPayloads = [
  // 1. NFC/NFD Unicode normalization variation
  {
    name: 'Unicode normalization (Café/Cafe\u0301)',
    payload: '{"precomposed_cafe": "Caf\\u00e9", "decomposed_cafe": "Cafe\\u0301", "Caf\\u00e9": "same_key_normalized"}',
    intended_pathology: 'unicode_normalization_variation'
  },
  // 2. Exponent float limits and floating point precision boundaries (within Number.EPSILON)
  {
    name: 'Exponent float limits and EPSILON boundary',
    payload: '{"exponent_1": 1.23e5, "exponent_2": 123000, "precision_epsilon_match": 1.0000000000000001, "precision_epsilon_mismatch": 1.000000000000002}',
    intended_pathology: 'exponent_epsilon_boundaries'
  },
  // 3. Extreme numbers (NaN, negative zero, infinity)
  {
    name: 'Extreme numbers (-0, NaN, Infinity)',
    payload: '{"neg_zero": -0.0, "positive_zero": 0.0, "infinity": 1e999}',
    intended_pathology: 'extreme_numeric_invariants'
  },
  // 4. Duplicate keys
  {
    name: 'Duplicate keys overwrite behavior',
    payload: '{"dup_key": "initial_value", "dup_key": "overwritten_value", "other_key": 42}',
    intended_pathology: 'duplicate_keys_overwrite'
  }
];

async function run() {
  console.log(`[+] Initializing ReplayQueueScheduler (Concurrency Pool Size: 2)`);
  const scheduler = new ReplayQueueScheduler(2);

  // We want to run a 30-iteration campaign to trigger different phases and predict onset
  const tasksCount = 30;
  console.log(`[+] Queueing ${tasksCount} tasks representing varying loads, normalizations, and sabotages...`);

  const promises = [];
  let completedCount = 0;
  let timeoutsCount = 0;
  let crashesCount = 0;

  const campaignResults: any[] = [];

  for (let i = 0; i < tasksCount; i++) {
    // Round-robin selection of our target payloads
    const payloadInfo = testPayloads[i % testPayloads.length];
    
    let entropyProfile: any = {};
    let flushInterval = 64;

    // Concurrently build up scheduler pressure to test Adaptive Archaeology Density and Divergence Onset Prediction
    if (i < 5) {
      // 1. Healthy calibration baseline runs
      entropyProfile = {
        async_chunk_jitter: false,
        stdout_fragmentation: false,
        scheduler_contention: false,
        descriptor_exhaustion: false
      };
      flushInterval = 64;
    } else if (i < 15) {
      // 2. Moderate perturbation -> triggers sampling & prediction
      entropyProfile = {
        async_chunk_jitter: true,
        jitter_intensity: 1.5,
        stdout_fragmentation: true,
        backpressure_intensity: 1.5
      };
      flushInterval = 16;
    } else if (i < 25) {
      // 3. High perturbation -> triggers write shedding & prediction warning alerts
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
    } else {
      // 4. Recovery runs
      entropyProfile = {
        async_chunk_jitter: false,
        stdout_fragmentation: false,
        scheduler_contention: false,
        descriptor_exhaustion: false
      };
      flushInterval = 64;
    }

    const contract: ReplayExecutionContract = {
      corpus_id: `conformance_p15_t${i}_${payloadInfo.intended_pathology}`,
      deterministic_seed: `phase15_t${i}`,
      runtime_pair: { primary: 'typescript', secondary: 'rust' },
      chunk_strategy: 'boundary_targeted',
      fragmentation_profile: { strategy: 'boundary_targeted' },
      snapshot_schema_version: 'v1.0',
      entropy_profile: entropyProfile,
      topology_flush_interval: flushInterval
    };

    const taskPromise = scheduler.schedule(contract, payloadInfo.payload).then(
      async (profile) => {
        completedCount++;
        const primary = profile.primary_artifacts;
        const secondary = profile.secondary_artifacts;

        if (primary.infrastructure_failure === 'TIMEOUT' || secondary.infrastructure_failure === 'TIMEOUT') timeoutsCount++;
        if (primary.infrastructure_failure === 'PROCESS_CRASH' || secondary.infrastructure_failure === 'PROCESS_CRASH') crashesCount++;

        const currentPhase = scheduler.classifyCollapsePhase(timeoutsCount, crashesCount);
        const queueDelay = scheduler.queueDelays[scheduler.queueDelays.length - 1] || 0;

        // Perform divergence onset prediction
        const prediction = scheduler.predictDivergenceOnset();

        // Configure persistence manager to apply backpressure governance
        const persistOptions = {
          compress: true,
          batchThreshold: 1,
          retentionCeiling: 100,
          queueDelayMs: queueDelay,
          pressureCeilingMs: 1500, // Trigger shedded/sampled under concurrency
          enableAdaptiveShedding: true,
          enableTopologySampling: true,
        };

        ReplayPersistenceManager.saveProfile(profile, persistOptions);

        // Load the saved profile to inspect the shedded/sampled telemetry and telemetry_confidence score
        const savedProfiles = ReplayPersistenceManager.loadAllProfiles();
        const latestSaved = savedProfiles[savedProfiles.length - 1];
        const persistenceMetrics = latestSaved?.persistence_metrics || {};

        // Perform recursive AST analysis and print results
        let astEqual = false;
        let tsASTType = 'N/A';
        let rustASTType = 'N/A';
        let astDetails = '';

        if (primary.final_result === 'accept' && secondary.final_result === 'accept') {
          try {
            const tsTokens = SemanticObjectProjector.extractTSTokens(primary.snapshots);
            const rustTokens = SemanticObjectProjector.extractRustTokens(secondary.snapshots, payloadInfo.payload);
            if (tsTokens.length > 0 && rustTokens.length > 0) {
              const tsAST = SemanticObjectProjector.buildAST(tsTokens);
              const rustAST = SemanticObjectProjector.buildAST(rustTokens);
              tsASTType = tsAST.type;
              rustASTType = rustAST.type;
              const compareRes = SemanticObjectProjector.compareASTs(tsAST, rustAST);
              astEqual = compareRes.isEqual;
              astDetails = compareRes.details || 'ASTs match perfectly.';
            } else {
              astDetails = 'No snapshots retrieved.';
            }
          } catch (e: any) {
            astDetails = `AST Build Error: ${e.message}`;
          }
        } else {
          astDetails = `Run failed (Primary: ${primary.final_result}, Secondary: ${secondary.final_result})`;
        }

        const resultRecord = {
          index: i,
          payloadName: payloadInfo.name,
          payloadType: payloadInfo.intended_pathology,
          classification: profile.classification,
          queueDelay,
          phase: currentPhase,
          prediction,
          telemetry_confidence: persistenceMetrics.telemetry_confidence ?? 1.0,
          astEqual,
          astDetails,
          tsASTType,
          rustASTType,
          shedded: persistenceMetrics.shedded ?? false,
          sampled: persistenceMetrics.sampled ?? false
        };

        campaignResults.push(resultRecord);

        console.log(`[Task ${completedCount}/${tasksCount}] Completed. ` +
          `Payload: "${payloadInfo.name}" | ` +
          `QueueDelay: ${queueDelay.toFixed(1)}ms | ` +
          `Confidence: ${(persistenceMetrics.telemetry_confidence ?? 1.0).toFixed(3)} | ` +
          `AST Equal: ${astEqual ? 'YES' : 'NO'} | ` +
          `Class: ${profile.classification}` +
          (astEqual ? '' : ` | Details: ${astDetails}`));

        return { status: 'success', profile };
      },
      (err) => {
        completedCount++;
        crashesCount++;
        const currentPhase = scheduler.classifyCollapsePhase(timeoutsCount, crashesCount);
        console.log(`[Task ${completedCount}/${tasksCount}] Errored: ${err.message}. Phase: ${currentPhase}`);
        return { status: 'error', error: err };
      }
    );

    promises.push(taskPromise);
  }

  console.log(`[+] Running tasks concurrently...`);
  await Promise.all(promises);

  scheduler.shutdown();
  console.log(`[+] Campaign completed.`);

  // 1. AST EQUIVALENCE & NORMALIZATION VERIFICATION REPORT
  console.log('\n========================================================================');
  console.log('            CANONICAL SEMANTIC & AST EQUIVALENCE REPORT                 ');
  console.log('========================================================================');
  
  const successfulASTs = campaignResults.filter(r => r.astEqual === true);
  console.log(`  - AST Structural Parity Runs: ${successfulASTs.length} / ${campaignResults.filter(r => r.astDetails.indexOf('Build Error') === -1 && r.astDetails.indexOf('failed') === -1).length}`);
  
  // Verify specific normalizations
  const unicodeRuns = campaignResults.filter(r => r.payloadType === 'unicode_normalization_variation' && r.astEqual);
  console.log(`  - Unicode Normalization (NFC/NFD) Equivalence Proofs:`);
  console.log(`    * Status: ${unicodeRuns.length > 0 ? 'SUCCESS' : 'FAILED'}`);
  if (unicodeRuns.length > 0) {
    console.log(`    * Example: ${unicodeRuns[0].astDetails}`);
  }

  const epsilonRuns = campaignResults.filter(r => r.payloadType === 'exponent_epsilon_boundaries' && r.astEqual);
  console.log(`  - Exponent & Floating-Point EPSILON Equivalence Proofs:`);
  console.log(`    * Status: ${epsilonRuns.length > 0 ? 'SUCCESS' : 'FAILED'}`);
  if (epsilonRuns.length > 0) {
    console.log(`    * Example: ${epsilonRuns[0].astDetails}`);
  }

  const numericRuns = campaignResults.filter(r => r.payloadType === 'extreme_numeric_invariants' && r.astEqual);
  console.log(`  - Extreme Number (-0/NaN/Infinity) Parity Validation:`);
  console.log(`    * Status: ${numericRuns.length > 0 ? 'SUCCESS' : 'FAILED'}`);
  if (numericRuns.length > 0) {
    console.log(`    * Example: ${numericRuns[0].astDetails}`);
  }

  const duplicateRuns = campaignResults.filter(r => r.payloadType === 'duplicate_keys_overwrite' && r.astEqual);
  console.log(`  - Duplicate Keys Overwrite Behavior Parity:`);
  console.log(`    * Status: ${duplicateRuns.length > 0 ? 'SUCCESS' : 'FAILED'}`);
  if (duplicateRuns.length > 0) {
    console.log(`    * Example: ${duplicateRuns[0].astDetails}`);
  }

  // 2. ADAPTIVE ARCHAEOLOGY DENSITY & CONFIDENCE SCORE REPORT
  console.log('\n========================================================================');
  console.log('        ADAPTIVE ARCHAEOLOGY DENSITY & CONFIDENCE ANALYSIS             ');
  console.log('========================================================================');
  
  const sheddedTasks = campaignResults.filter(r => r.shedded === true);
  const sampledTasks = campaignResults.filter(r => r.sampled === true);
  const normalTasks = campaignResults.filter(r => !r.shedded && !r.sampled);

  console.log(`Archaeology Density & Sampling Distribution:`);
  console.log(`  - Fully Retained Runs (Telemetry Confidence = 1.0): ${normalTasks.length}`);
  if (normalTasks.length > 0) {
    console.log(`    * Example Task ${normalTasks[0].index}: Confidence = ${normalTasks[0].telemetry_confidence.toFixed(3)}`);
  }
  
  console.log(`  - Sampled Runs (Telemetry Confidence < 1.0 & > 0.0):  ${sampledTasks.length}`);
  if (sampledTasks.length > 0) {
    console.log(`    * Example Task ${sampledTasks[0].index}: Confidence = ${sampledTasks[0].telemetry_confidence.toFixed(3)} (Shedded: false, Sampled: true)`);
  }

  console.log(`  - Shedded Runs (Telemetry Confidence = 0.0):          ${sheddedTasks.length}`);
  if (sheddedTasks.length > 0) {
    console.log(`    * Example Task ${sheddedTasks[0].index}: Confidence = ${sheddedTasks[0].telemetry_confidence.toFixed(3)} (Shedded: true)`);
  }

  // 3. DIVERGENCE ONSET PREDICTION REPORT
  console.log('\n========================================================================');
  console.log('              DIVERGENCE ONSET PREDICTION REPORT                       ');
  console.log('========================================================================');
  
  const highRiskPredictions = campaignResults.filter(r => r.prediction?.riskLevel === 'high');
  const mediumRiskPredictions = campaignResults.filter(r => r.prediction?.riskLevel === 'medium');

  console.log(`Predictions:`);
  console.log(`  - High Risk Alerts Logged:   ${highRiskPredictions.length}`);
  if (highRiskPredictions.length > 0) {
    console.log(`    * Task ${highRiskPredictions[0].index}: Estimated tasks to collapse = ${highRiskPredictions[0].prediction.estimatedTasksToCollapse.toFixed(2)}`);
  }
  console.log(`  - Medium Risk Alerts Logged: ${mediumRiskPredictions.length}`);
  if (mediumRiskPredictions.length > 0) {
    console.log(`    * Task ${mediumRiskPredictions[0].index}: Estimated tasks to collapse = ${mediumRiskPredictions[0].prediction.estimatedTasksToCollapse.toFixed(2)}`);
  }

  console.log('\n==================== SCHEDULER DERIVATIVES REPORT ====================');
  console.log(`Queue Acceleration:          ${scheduler.getQueueAcceleration().toFixed(4)} ms/task^2`);
  console.log(`Drain Latency Acceleration:  ${scheduler.getDrainLatencyAcceleration().toFixed(4)} ms/task^2`);
  console.log(`Variance Growth Rate:        ${scheduler.getVarianceGrowthRate().toFixed(4)} ms^2/task`);
  console.log(`Memory Growth Rate:          ${scheduler.getMemoryGrowthRate().toFixed(4)} bytes/task`);
  console.log(`Memory Acceleration:         ${scheduler.getMemoryAcceleration().toFixed(4)} bytes/task^2`);
  console.log(`Replay Recovery Half-Life:   ${scheduler.recoveryHalfLifeMs} ms`);

  console.log('\n[SUCCESS] Phase 15 Verification Campaign Run Complete.');
}

run().catch(err => {
  console.error('Fatal run error:', err);
  process.exit(1);
});
