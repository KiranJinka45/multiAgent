import dotenv from 'dotenv';
dotenv.config();

import {
  SubsystemRetirementEvaluator,
  ExplainabilityCompressor,
  InstitutionalRecoveryTool,
  OperationalExitCertifier,
  SubsystemMetrics,
  Hypothesis,
  PlaybookMetadata,
  TelemetryMappingInput,
  ExitCriteriaInput
} from '../packages/runtime-core/src/index';

async function runPhase24Verification() {
  console.log('================================================================================');
  console.log('🧪  ZTAN PHASE 24 — STEWARDSHIP COMPRESSION & OPERATIONAL EXIT RUNNER');
  console.log('================================================================================\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 1: Subsystem Retirement Evaluator
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 1] Testing Subsystem Retirement Evaluator...');
  const evaluator = new SubsystemRetirementEvaluator();

  // Case A: Useful, active subsystem
  const activeSubsystem: SubsystemMetrics = {
    name: 'TimeWarpPathology',
    loc: 250,
    incidentsAlerted: 10,
    incidentsResolved: 9,
    falsePositiveAlerts: 1,
    operatorViewsCount: 40
  };
  const reportActive = evaluator.evaluateRetirement(activeSubsystem);
  console.log(`     - ${reportActive.subsystemName}: EfficacyScore=${reportActive.efficacyScore}, isEligible=${reportActive.isEligibleForRetirement}`);
  if (reportActive.isEligibleForRetirement || reportActive.efficacyScore < 0.70) {
    throw new Error('SubsystemRetirementEvaluator incorrectly flagged useful active subsystem for retirement!');
  }

  // Case B: Noisy, unused subsystem
  const noisySubsystem: SubsystemMetrics = {
    name: 'StaleValidatorSidecar',
    loc: 500,
    incidentsAlerted: 5,
    incidentsResolved: 0,
    falsePositiveAlerts: 45,
    operatorViewsCount: 1 // SREs never look at it
  };
  const reportNoisy = evaluator.evaluateRetirement(noisySubsystem);
  console.log(`     - ${reportNoisy.subsystemName}: EfficacyScore=${reportNoisy.efficacyScore}, isEligible=${reportNoisy.isEligibleForRetirement}`);
  if (!reportNoisy.isEligibleForRetirement || reportNoisy.efficacyScore > 0.10) {
    throw new Error('SubsystemRetirementEvaluator failed to recommend noisy unviewed subsystem for retirement!');
  }

  // Case C: Small footprint subsystem (under 100 LOC)
  const tinySubsystem: SubsystemMetrics = {
    name: 'TinyGcTelemetryLogger',
    loc: 45,
    incidentsAlerted: 2,
    incidentsResolved: 0,
    falsePositiveAlerts: 10,
    operatorViewsCount: 0
  };
  const reportTiny = evaluator.evaluateRetirement(tinySubsystem);
  console.log(`     - ${reportTiny.subsystemName}: EfficacyScore=${reportTiny.efficacyScore}, isEligible=${reportTiny.isEligibleForRetirement}, reason="${reportTiny.reason}"`);
  if (reportTiny.isEligibleForRetirement || !reportTiny.reason.includes('Excluded')) {
    throw new Error('SubsystemRetirementEvaluator failed to exclude small-footprint subsystems from retirement checks!');
  }

  console.log('  ✅ Subsystem Retirement Evaluator verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 2: Explainability Compressor (Hypothesis Preservation)
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 2] Testing Explainability Compressor (Hypothesis Preservation)...');
  const compressor = new ExplainabilityCompressor();

  // Case A: High certainty, clear dominant cause (Uncertainty Level: LOW)
  const hypothesesClear: Hypothesis[] = [
    { label: 'WAL_STALL', description: 'Disk stall on WAL writes', probability: 0.85, confidenceInterval: [0.8, 0.9], supportingEvidence: ['fsync delay'] },
    { label: 'REPLICA_LAG', description: 'Replica delay', probability: 0.15, confidenceInterval: [0.1, 0.2], supportingEvidence: ['network buffer full'] }
  ];
  const explanationClear = compressor.compressExplanation(hypothesesClear);
  console.log(`     - Clear: Dominant=${explanationClear.dominantCause}, Prob=${explanationClear.dominantProbability}, uncertainty=${explanationClear.uncertaintyLevel}`);
  console.log(`       └─ Summary: "${explanationClear.cognitiveSummary}"`);

  if (explanationClear.uncertaintyLevel !== 'LOW' || explanationClear.dominantCause !== 'WAL_STALL' || explanationClear.cognitiveSummary.includes('Competing')) {
    throw new Error('ExplainabilityCompressor clear hypothesis classification incorrect!');
  }

  // Case B: Close competing causes (Uncertainty Level: HIGH, preserves branches)
  const hypothesesCompeting: Hypothesis[] = [
    { label: 'CLOCK_SKEW_OR_VM_DISCONTINUITY', description: 'Hypervisor pause', probability: 0.42, confidenceInterval: [0.35, 0.50], supportingEvidence: ['timestamp delta -25ms'] },
    { label: 'TELEMETRY_LOG_LOSS_OR_BUFFER_EXHAUSTION', description: 'Buffer overflow', probability: 0.38, confidenceInterval: [0.30, 0.45], supportingEvidence: ['step gap index'] },
    { label: 'RETRY_STORM', description: 'Connection loop', probability: 0.20, confidenceInterval: [0.15, 0.25], supportingEvidence: ['multiple connect retries'] }
  ];
  const explanationCompeting = compressor.compressExplanation(hypothesesCompeting);
  console.log(`     - Competing: Dominant=${explanationCompeting.dominantCause}, Prob=${explanationCompeting.dominantProbability}, uncertainty=${explanationCompeting.uncertaintyLevel}`);
  console.log(`       └─ Summary: "${explanationCompeting.cognitiveSummary}"`);

  if (explanationCompeting.uncertaintyLevel !== 'HIGH' || !explanationCompeting.cognitiveSummary.includes('Competing root-cause alternative')) {
    throw new Error('ExplainabilityCompressor failed to preserve competing hypotheses or flag high uncertainty!');
  }

  console.log('  ✅ Explainability Compressor verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 3: Institutional Recovery & Playbook Reconstruction
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 3] Testing Institutional Recovery & Playbook Reconstruction...');
  const recoveryTool = new InstitutionalRecoveryTool();

  const stalePlaybooks: PlaybookMetadata[] = [
    {
      name: 'WAL Corruption Recovery Drill',
      daysSinceLastUpdate: 120, // stale (> 90 days)
      operatorOverrideCount: 12, // high value
      successRate: 0.85
    },
    {
      name: 'NTP Synchronization Repair',
      daysSinceLastUpdate: 30, // active
      operatorOverrideCount: 1,
      successRate: 0.95
    },
    {
      name: 'Stale Heap Dump Analysis Guide',
      daysSinceLastUpdate: 150, // stale (> 90 days)
      operatorOverrideCount: 0, // low value
      successRate: 0.10
    }
  ];

  const abandonedTelemetry: TelemetryMappingInput[] = [
    {
      fieldName: 'autovacuum_starvation_dead_tuples',
      historicalIncidentClass: 'POSTGRES_VACUUM_COLLAPSE',
      lastSeenDaysAgo: 110 // stale (> 90 days)
    },
    {
      fieldName: 'gc_compaction_runs',
      historicalIncidentClass: 'RUNTIME_HEAP_SLOPE',
      lastSeenDaysAgo: 10 // active
    }
  ];

  const recoveryReport = recoveryTool.reconstructPlaybooks(stalePlaybooks, abandonedTelemetry);
  console.log(`     - Reconstructed Playbooks: ${JSON.stringify(recoveryReport.reconstructedPlaybooks)}`);
  console.log(`     - Mapped Telemetry: ${JSON.stringify(recoveryReport.abandonedTelemetryMapped)}`);
  console.log(`     - Actionable Playbooks: ${JSON.stringify(recoveryReport.actionablePlaybooks)}`);
  for (const warn of recoveryReport.warnings) {
    console.log(`       ├─ Warning: "${warn}"`);
  }

  if (recoveryReport.reconstructedPlaybooks.length !== 1 || recoveryReport.reconstructedPlaybooks[0] !== 'WAL Corruption Recovery Drill') {
    throw new Error('InstitutionalRecoveryTool failed to flag high-value stale playbooks for reconstruction!');
  }
  if (!recoveryReport.abandonedTelemetryMapped['autovacuum_starvation_dead_tuples'] || recoveryReport.abandonedTelemetryMapped['gc_compaction_runs']) {
    throw new Error('InstitutionalRecoveryTool abandoned telemetry mapping logic incorrect!');
  }
  if (recoveryReport.actionablePlaybooks.length !== 1 || recoveryReport.actionablePlaybooks[0] !== 'NTP Synchronization Repair') {
    throw new Error('InstitutionalRecoveryTool failed to identify currently active, validated playbooks!');
  }

  console.log('  ✅ Institutional Recovery & Playbook Reconstruction verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 4: Operational Exit Certifier (Archival Freezing)
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 4] Testing Operational Exit Certifier...');
  const exitCertifier = new OperationalExitCertifier();

  // Case A: Compliant, certified for freeze
  const compliantInput: ExitCriteriaInput = {
    netTelemetryGrowthRate: -0.02, // shrinking
    codeChangeRatePerMonth: 2, // low
    onboardingSuccessRate: 0.95, // high success
    activeAlertVolumePerDay: 0.8, // low load
    unresolvedIncidentsCount: 0 // clean queue
  };
  const certCompliant = exitCertifier.evaluateExitCriteria(compliantInput);
  console.log(`     - Compliant: isCertified=${certCompliant.isCertifiedForArchivalFreeze}, state=${certCompliant.systemState}`);
  if (!certCompliant.isCertifiedForArchivalFreeze || certCompliant.systemState !== 'STABILIZED' || certCompliant.unmetCriteria.length > 0) {
    throw new Error('OperationalExitCertifier failed to certify compliant system metrics!');
  }
  if (!certCompliant.warnings.some(w => w.includes('ARCHIVAL_FREEZE'))) {
    throw new Error('OperationalExitCertifier did not generate archival freeze warning for certified setup!');
  }

  // Case B: Hypertrophic, code/telemetry still expanding
  const hypertrophicInput: ExitCriteriaInput = {
    netTelemetryGrowthRate: 0.12, // positive growth (> 10%)
    codeChangeRatePerMonth: 250, // rapid modifications
    onboardingSuccessRate: 0.70, // low success
    activeAlertVolumePerDay: 8.5, // high load
    unresolvedIncidentsCount: 4
  };
  const certHyper = exitCertifier.evaluateExitCriteria(hypertrophicInput);
  console.log(`     - Hypertrophic: isCertified=${certHyper.isCertifiedForArchivalFreeze}, state=${certHyper.systemState}, unmetCount=${certHyper.unmetCriteria.length}`);
  for (const unmet of certHyper.unmetCriteria) {
    console.log(`       ├─ Unmet: "${unmet}"`);
  }

  if (certHyper.isCertifiedForArchivalFreeze || certHyper.systemState !== 'HYPERTROPHIC' || certHyper.unmetCriteria.length !== 5) {
    throw new Error('OperationalExitCertifier failed to flag active hypertrophy and unmet criteria!');
  }
  if (!certHyper.warnings.some(w => w.includes('hypertrophy in progress'))) {
    throw new Error('OperationalExitCertifier failed to generate critical hypertrophy alert warnings!');
  }

  console.log('  ✅ Operational Exit Certifier verified.\n');

  console.log('================================================================================');
  console.log('🎉  ALL ZTAN PHASE 24 VERIFICATION DRILLS COMPLETED SUCCESSFULLY!');
  console.log('================================================================================');
}

runPhase24Verification().catch(err => {
  console.error('\n❌  VERIFICATION FAILURE DETECTED:');
  console.error(err);
  process.exit(1);
});
