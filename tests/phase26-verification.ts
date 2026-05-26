import dotenv from 'dotenv';
dotenv.config();

import {
  EvidencePlaneDecoupler,
  DecoupledBufferReport,
  ChronologyTrustZoneClassifier,
  ChronologyZoneReport,
  ChronologyZone,
  StorageConfidenceProvenanceEngine,
  StorageProvenanceReport,
  StorageConfidenceLevel,
  EnvironmentalReproducibilityArchaeologist,
  EnvironmentalFingerprint,
  ReproducibilityReport,
  SemanticDriftArchaeologist,
  SemanticDriftReport,
  DegradedSurvivalCoordinator,
  DegradedSurvivalReport,
  TelemetryEvent
} from '../packages/runtime-core/src/index';

async function runPhase26Verification() {
  console.log('================================================================================');
  console.log('🧪  ZTAN PHASE 26 — STEWARDSHIP PLANE ISOLATION & PHYSICAL REALITY BOUNDARIES');
  console.log('================================================================================\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 1: Evidence Plane Decoupler
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 1] Testing Evidence Plane Decoupler (Decoupling & Silent Catch-All)...');
  const decoupler = new EvidencePlaneDecoupler(5); // Bound buffer size to 5 for easy testing
  
  // Register a listener simulating database/ingestion crashes
  decoupler.registerAsyncListener(async (events) => {
    throw new Error('Database write failure: Connection timeout or write replication stall');
  });

  const event: TelemetryEvent = {
    id: 'test-evt-1',
    type: 'HEARTBEAT',
    timestamp: Date.now(),
    entropyScore: 0.1,
    payload: { sourceComponent: 'WebEngine', port: 8080 }
  };

  // 1. Emit should be synchronous and non-blocking
  decoupler.emitEvidence(event);
  let report = decoupler.getMetricsReport();
  console.log(`     - Emitted event: bufferSize=${report.bufferSize}`);
  if (report.bufferSize !== 1) {
    throw new Error('EvidencePlaneDecoupler failed to queue event synchronously!');
  }

  // 2. Bound limit test (capacity = 5)
  for (let i = 2; i <= 7; i++) {
    decoupler.emitEvidence({
      id: `test-evt-${i}`,
      type: 'METRIC',
      timestamp: Date.now(),
      entropyScore: 0.05,
      payload: { value: i }
    });
  }
  report = decoupler.getMetricsReport();
  console.log(`     - Filled past bounds: bufferSize=${report.bufferSize}, droppedCount=${report.droppedEventsCount}`);
  if (report.bufferSize !== 5 || report.droppedEventsCount !== 2) {
    throw new Error('EvidencePlaneDecoupler defensive drop/bound policy failed!');
  }

  // 3. Flush test (should catch database error silently and preserve runtime execution)
  console.log('     - Flushing buffer (expecting silent database write exception)...');
  await decoupler.flushBuffer();
  report = decoupler.getMetricsReport();
  console.log(`     - Post flush: bufferSize=${report.bufferSize}, failuresCount=${report.failureCount}`);
  if (report.bufferSize !== 0 || report.failureCount !== 1) {
    throw new Error('EvidencePlaneDecoupler failed to isolate flush crashes or clear buffer!');
  }

  console.log('  ✅ Evidence Plane Decoupler verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 2: Chronology Trust Zone Classifier
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 2] Testing Chronology Trust Zone Classifier...');
  const chronoClassifier = new ChronologyTrustZoneClassifier();

  const normalEvent: TelemetryEvent = {
    id: 'e-1',
    type: 'TRANSACTION',
    timestamp: Date.now(),
    entropyScore: 0.12,
    payload: {}
  };

  // Case A: Secure monotonic clock
  const zoneA = chronoClassifier.classifyChronoZone(normalEvent, false, 0);
  console.log(`     - Secure Case: Zone=${zoneA.chronologyZone}, Score=${zoneA.chronologyIntegrityScore}, uncertainty=${zoneA.uncertaintyEnvelopeMs}ms`);
  if (zoneA.chronologyZone !== 'MONOTONIC_SECURE' || zoneA.chronologyIntegrityScore !== 1.0) {
    throw new Error('ChronologyTrustZoneClassifier incorrectly classified secure monotonic clock!');
  }

  // Case B: VM suspend discontinuity detected
  const zoneB = chronoClassifier.classifyChronoZone(normalEvent, true, 2);
  console.log(`     - VM Suspend Case: Zone=${zoneB.chronologyZone}, Score=${zoneB.chronologyIntegrityScore}, uncertainty=${zoneB.uncertaintyEnvelopeMs}ms`);
  if (zoneB.chronologyZone !== 'DRIFT_SUSPECT' || zoneB.chronologyIntegrityScore !== 0.65) {
    throw new Error('ChronologyTrustZoneClassifier failed to identify VM suspend discontinuity!');
  }

  // Case C: Major NTP offset step (e.g. 1.5s clock step)
  const zoneC = chronoClassifier.classifyChronoZone(normalEvent, false, 1500);
  console.log(`     - NTP Step Case: Zone=${zoneC.chronologyZone}, Score=${zoneC.chronologyIntegrityScore}, uncertainty=${zoneC.uncertaintyEnvelopeMs}ms`);
  if (zoneC.chronologyZone !== 'CHRONO_COMPROMISED' || zoneC.chronologyIntegrityScore !== 0.15) {
    throw new Error('ChronologyTrustZoneClassifier failed to identify NTP clock step compromise!');
  }

  // Case D: Backwards chronology step event
  const backwardsEvent: TelemetryEvent = {
    id: 'e-2',
    type: 'TRANSACTION',
    timestamp: Date.now(),
    entropyScore: 0.9,
    payload: { backwardsChronologyStep: true }
  };
  const zoneD = chronoClassifier.classifyChronoZone(backwardsEvent, false, 0);
  console.log(`     - Negative Step Case: Zone=${zoneD.chronologyZone}, Score=${zoneD.chronologyIntegrityScore}, provenance="${zoneD.sourceProvenance}"`);
  if (zoneD.chronologyZone !== 'CHRONO_COMPROMISED' || zoneD.chronologyIntegrityScore !== 0.05) {
    throw new Error('ChronologyTrustZoneClassifier failed to detect absolute backwards chronology step!');
  }

  console.log('  ✅ Chronology Trust Zone Classifier verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 3: Storage Confidence Provenance Engine
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 3] Testing Storage Confidence Provenance Engine...');
  const storageEngine = new StorageConfidenceProvenanceEngine();

  // Case A: Perfect parity storage write
  const provA = storageEngine.evaluateStorageProvenance({
    fsyncBarrierVerified: true,
    checksumMatch: true,
    writeOrderPreserved: true,
    unverifiableDelayMs: 25,
    firmwareWarningDetected: false
  });
  console.log(`     - Perfect Storage: ConfidenceLevel=${provA.confidenceLevel}, Score=${provA.storageTruthConfidence}`);
  if (provA.confidenceLevel !== 'STRONG_PARITY' || provA.storageTruthConfidence !== 1.0) {
    throw new Error('StorageConfidenceProvenanceEngine failed to recognize stable parity write!');
  }

  // Case B: Silent SSD block/firmware warning or checksum mismatch
  const provB = storageEngine.evaluateStorageProvenance({
    fsyncBarrierVerified: true,
    checksumMatch: false, // Checksum failed!
    writeOrderPreserved: true,
    unverifiableDelayMs: 25,
    firmwareWarningDetected: false
  });
  console.log(`     - Corruption Case: ConfidenceLevel=${provB.confidenceLevel}, Score=${provB.storageTruthConfidence}, anomalies=${provB.anomalies.length}`);
  if (provB.confidenceLevel !== 'FILESYSTEM_CORRUPT' || provB.storageTruthConfidence !== 0.10) {
    throw new Error('StorageConfidenceProvenanceEngine failed to identify corrupted filesystem blocks!');
  }

  // Case C: Torn-write hardware reordering hazard
  const provC = storageEngine.evaluateStorageProvenance({
    fsyncBarrierVerified: false, // Fsync unconfirmed
    checksumMatch: true,
    writeOrderPreserved: false, // Order lost
    unverifiableDelayMs: 200,
    firmwareWarningDetected: false
  });
  console.log(`     - Torn Write Hazard: ConfidenceLevel=${provC.confidenceLevel}, Score=${provC.storageTruthConfidence}`);
  if (provC.confidenceLevel !== 'PARTIAL_TORN_RISK' || provC.storageTruthConfidence !== 0.45) {
    throw new Error('StorageConfidenceProvenanceEngine failed to flag torn-write reordering risks!');
  }

  console.log('  ✅ Storage Confidence Provenance Engine verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 4: Environmental Reproducibility Archaeologist
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 4] Testing Environmental Reproducibility Archaeologist...');
  const envArchaeologist = new EnvironmentalReproducibilityArchaeologist();

  const baselineFingerprint: EnvironmentalFingerprint = {
    packageGraphFingerprint: 'npm-graph-sha256-abc123xyz',
    libcHash: 'glibc-so-v2.35-checksum',
    kernelVersion: 'linux-5.15.0-76-generic',
    pgMinorVersion: '15.3',
    vmConfigurationLineage: 'Premium.Compute.VM.AWS',
    timestamp: Date.now() - 86400000
  };

  // Save historical baseline fingerprint
  envArchaeologist.saveBaselineFingerprint('incident-101', baselineFingerprint);

  // Case A: Identical environment
  const currentIdentical = envArchaeologist.captureCurrentFingerprint(
    'npm-graph-sha256-abc123xyz',
    'glibc-so-v2.35-checksum',
    'linux-5.15.0-76-generic',
    '15.3',
    'Premium.Compute.VM.AWS'
  );
  const auditA = envArchaeologist.auditEnvironmentalReproducibility('incident-101', currentIdentical);
  console.log(`     - Identical Env Audit: isReproducible=${auditA.isFullyReproducible}, similarity=${auditA.similarityIndex}`);
  if (!auditA.isFullyReproducible || auditA.similarityIndex !== 1.0) {
    throw new Error('EnvironmentalReproducibilityArchaeologist incorrectly flagged exact environment matching!');
  }

  // Case B: Supply chain package dependency shift, OS glibc change, and PostgreSQL minor mismatch
  const currentDivergent = envArchaeologist.captureCurrentFingerprint(
    'npm-graph-sha256-different-lockfile', // Package graph shift
    'glibc-so-v2.36-mutated-hash', // OS glibc change
    'linux-5.15.0-76-generic',
    '15.5', // PG minor version shift
    'Premium.Compute.VM.AWS'
  );
  const auditB = envArchaeologist.auditEnvironmentalReproducibility('incident-101', currentDivergent);
  console.log(`     - Divergent Env Audit: isReproducible=${auditB.isFullyReproducible}, similarity=${auditB.similarityIndex}, warningsCount=${auditB.divergenceWarnings.length}`);
  if (auditB.isFullyReproducible || auditB.similarityIndex > 0.3) {
    throw new Error('EnvironmentalReproducibilityArchaeologist failed to calculate correct environmental drift score!');
  }

  console.log('  ✅ Environmental Reproducibility Archaeologist verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 5: Semantic Drift Archaeologist (Engineering vocabulary mutation)
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 5] Testing Semantic Drift Archaeologist...');
  const semanticDrift = new SemanticDriftArchaeologist();

  // Case A: Clean rationales adhering strictly to core dictionary meanings
  const cleanRationales = [
    'Enforcing absolute freeze due to primary transaction lease failures.',
    'SRE team requested emergency multi-signature thaw bypass with consensus authorization.'
  ];
  const auditClean = semanticDrift.auditSemanticDrift(cleanRationales);
  console.log(`     - Stable Vocabulary: DriftIndex=${auditClean.vocabularyDriftIndex}, Spike=${auditClean.semanticVocabularySpike}`);
  if (auditClean.vocabularyDriftIndex !== 0.0 || auditClean.semanticVocabularySpike) {
    throw new Error('SemanticDriftArchaeologist incorrectly flagged correct standard vocabulary usage!');
  }

  // Case B: SRE team mutating vocabulary definitions (e.g. calling freeze "soft slowdown", and thaw a "single-click routine")
  const mutatedRationales = [
    'Initiated advisory deploy soft-freeze slowdown on testing modules.',
    'Used standard thaw command for convenience to bypass CI blocker automatically.'
  ];
  const auditMutated = semanticDrift.auditSemanticDrift(mutatedRationales);
  console.log(`     - Mutated Vocabulary: DriftIndex=${auditMutated.vocabularyDriftIndex}, Spike=${auditMutated.semanticVocabularySpike}, warningsCount=${auditMutated.warnings.length}`);
  if (auditMutated.vocabularyDriftIndex !== 1.0 || !auditMutated.semanticVocabularySpike) {
    throw new Error('SemanticDriftArchaeologist failed to flag high semantic vocabulary drift!');
  }

  console.log('  ✅ Semantic Drift Archaeologist verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 6: Degraded Stewardship Survival Mode
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 6] Testing Degraded Stewardship Survival Mode...');
  
  // Case A: Normal SRE staffing & budget (Survival mode off, no pruning)
  const survivalCoordinator = new DegradedSurvivalCoordinator(1.0, 1.0);
  let status = survivalCoordinator.getSurvivalReport();
  console.log(`     - Normal State: modeActive=${status.degradedSurvivalMode}, indexingActive=${status.nonCriticalSearchIndexingActive}`);
  if (status.degradedSurvivalMode || !status.nonCriticalSearchIndexingActive) {
    throw new Error('DegradedSurvivalCoordinator activated survival mode under full SRE/budget conditions!');
  }

  const complexEvent: TelemetryEvent = {
    id: 'evt-comp-100',
    type: 'QUERY_EXPLAIN',
    timestamp: 1716670000000,
    entropyScore: 0.85,
    payload: {
      eventClass: 'SLOW_QUERY_ALERT',
      sourceComponent: 'PostgresQueryOptimizer',
      anomalyEntropy: 0.85,
      highCardinalityStack: 'at executeQuery -> src/postgres.ts:L142 -> internalQuery',
      operatorOverrideRationale: 'Temporarily bypassed lock constraints to resolve replication loop',
      activeValidatorLineage: 'Policy.PostgresAutovacuum.ReplicationOutboxValidator'
    }
  };

  const processedNormal = survivalCoordinator.pruneTelemetryEvent(complexEvent);
  if (processedNormal.payload.highCardinalityStack === undefined) {
    throw new Error('DegradedSurvivalCoordinator pruned metadata when degraded survival mode was inactive!');
  }

  // Case B: Catastrophic SRE staffing reduction (SRE staff ratio 0.3)
  survivalCoordinator.updateOperationalMetrics(0.3, 1.0);
  status = survivalCoordinator.getSurvivalReport();
  console.log(`     - Staff Downsized: modeActive=${status.degradedSurvivalMode}, minimalDatasetEnforced=${status.minimalDatasetEnforced}`);
  if (!status.degradedSurvivalMode || !status.minimalDatasetEnforced) {
    throw new Error('DegradedSurvivalCoordinator failed to activate survival mode under staffing shortage!');
  }

  const processedPruned = survivalCoordinator.pruneTelemetryEvent(complexEvent);
  status = survivalCoordinator.getSurvivalReport();
  console.log(`     - Pruned Event keys: ${Object.keys(processedPruned.payload).join(', ')}, bytesSaved=${status.bytesSaved}`);
  
  // Minimal reconstructible dataset check:
  // Must preserve only timestamp, eventClass, sourceComponent, and anomalyEntropy
  const payloadKeys = Object.keys(processedPruned.payload);
  if (
    payloadKeys.length !== 3 ||
    !payloadKeys.includes('eventClass') ||
    !payloadKeys.includes('sourceComponent') ||
    !payloadKeys.includes('anomalyEntropy') ||
    processedPruned.payload.highCardinalityStack !== undefined
  ) {
    throw new Error('DegradedSurvivalCoordinator failed to enforce absolute minimal reconstructible dataset bounds!');
  }

  console.log('  ✅ Degraded Stewardship Survival Mode verified.\n');

  console.log('🎉==============================================================================');
  console.log('🏆  ALL ZTAN PHASE 26 CORE SUBSYSTEM VERIFICATION DRILLS PASSED SUCCESSFULLY!');
  console.log('==============================================================================🎉');
}

runPhase26Verification().catch((err) => {
  console.error('\n❌ VERIFICATION DRILLS FAILED IN RUNTIME STAGE:');
  console.error(err);
  process.exit(1);
});
