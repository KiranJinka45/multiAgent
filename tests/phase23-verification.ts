import dotenv from 'dotenv';
dotenv.config();

import {
  RarityTelemetryValuer,
  CounterfactualReplayTester,
  OperatorEscalationCompressor,
  DynamicInteractionArchaeologist,
  StewardshipDensityTracker,
  StewardshipSurvivabilityForecaster,
  DestructiveSimplifier,
  TelemetryEvent,
  Alert,
  PolicyRule,
  TelemetryFieldMetadata
} from '../packages/runtime-core/src/index';

async function runPhase23Verification() {
  console.log('================================================================================');
  console.log('🧪  ZTAN PHASE 23 — CONTROLLED DELETION & SURVIVABILITY REDUCTION RUNNER');
  console.log('================================================================================\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 1: Rarity-Aware Telemetry Valuer
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 1] Testing Rarity-Aware Telemetry Valuer...');
  const valuer = new RarityTelemetryValuer();

  const fieldMetas: TelemetryFieldMetadata[] = [
    {
      name: 'split_brain_indicator',
      anomalyRarity: 0.95, // extremely rare
      causalCentrality: 0.80,
      recoveryContribution: 0.85,
      reconstructionWeight: 0.90
    },
    {
      name: 'scheduler_starvation_ms',
      anomalyRarity: 0.85, // rare
      causalCentrality: 0.70,
      recoveryContribution: 0.60,
      reconstructionWeight: 0.50
    },
    {
      name: 'routine_poll_latency',
      anomalyRarity: 0.05, // common
      causalCentrality: 0.10,
      recoveryContribution: 0.05,
      reconstructionWeight: 0.10
    },
    {
      name: 'unused_diagnostic_metric',
      anomalyRarity: 0.01,
      causalCentrality: 0.01,
      recoveryContribution: 0.01,
      reconstructionWeight: 0.01
    }
  ];

  const valueReport = valuer.evaluateTelemetryValue(fieldMetas);
  console.log(`     - Evaluated Fields Count: ${Object.keys(valueReport.fieldValues).length}`);
  console.log(`     - Recommended Retirements: ${JSON.stringify(valueReport.recommendedPruning)}`);
  console.log(`     - Protected Fields: ${JSON.stringify(valueReport.protectedFields)}`);

  if (!valueReport.protectedFields.includes('split_brain_indicator') || !valueReport.protectedFields.includes('scheduler_starvation_ms')) {
    throw new Error('RarityTelemetryValuer failed to protect rare or critical telemetry fields!');
  }
  if (!valueReport.recommendedPruning.includes('routine_poll_latency') || !valueReport.recommendedPruning.includes('unused_diagnostic_metric')) {
    throw new Error('RarityTelemetryValuer failed to recommend low-value common metrics for pruning!');
  }
  if (valueReport.fieldValues['split_brain_indicator'] < 0.80 || valueReport.fieldValues['routine_poll_latency'] > 0.20) {
    throw new Error('RarityTelemetryValuer composite score calculation incorrect!');
  }

  console.log('  ✅ Rarity-Aware Telemetry Valuer verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 2: Counterfactual Replay Tester
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 2] Testing Counterfactual Replay Tester...');
  const replayTester = new CounterfactualReplayTester();

  const mockEvents: TelemetryEvent[] = [
    { id: 'e_start', type: 'STARTUP', timestamp: 10000, entropyScore: 0.1, payload: { traceId: 'tx1' } },
    { id: 'e_heartbeat', type: 'HEARTBEAT', timestamp: 20000, entropyScore: 0.02, payload: { node: 'worker-1' } },
    { id: 'e_starve', type: 'SCHEDULER_STARVATION', timestamp: 30000, entropyScore: 0.88, payload: { duration_ms: 1200 } }, // anomaly + critical
    { id: 'e_lease', type: 'RELEASE_LEASE', timestamp: 40000, entropyScore: 0.15, payload: { leaseId: 'l2' } }, // critical action
    { id: 'e_end', type: 'SHUTDOWN', timestamp: 50000, entropyScore: 0.1, payload: {} } // boundary + critical
  ];

  // Test pruning a safe field (HEARTBEAT)
  const safePrune = replayTester.testCounterfactualPruning(mockEvents, 'HEARTBEAT');
  console.log(`     - Pruning 'HEARTBEAT': isSafe=${safePrune.isSafeToPrune}, certainty=${safePrune.replayCertainty}, warnings=${safePrune.warnings.length}`);
  if (!safePrune.isSafeToPrune || safePrune.replayCertainty < 1.0 || safePrune.warnings.length > 0) {
    throw new Error('CounterfactualReplayTester incorrectly flagged a safe telemetry prune as unsafe!');
  }

  // Test pruning a critical anomaly field (SCHEDULER_STARVATION)
  const unsafePruneAnomaly = replayTester.testCounterfactualPruning(mockEvents, 'SCHEDULER_STARVATION');
  console.log(`     - Pruning 'SCHEDULER_STARVATION': isSafe=${unsafePruneAnomaly.isSafeToPrune}, certainty=${unsafePruneAnomaly.replayCertainty}, warnings=${unsafePruneAnomaly.warnings.length}`);
  if (unsafePruneAnomaly.isSafeToPrune || unsafePruneAnomaly.replayCertainty >= 0.70 || unsafePruneAnomaly.warnings.length === 0) {
    throw new Error('CounterfactualReplayTester failed to block pruning of a critical anomaly!');
  }

  // Test pruning a boundary field (STARTUP)
  const unsafePruneBoundary = replayTester.testCounterfactualPruning(mockEvents, 'STARTUP');
  console.log(`     - Pruning 'STARTUP': isSafe=${unsafePruneBoundary.isSafeToPrune}, certainty=${unsafePruneBoundary.replayCertainty}`);
  if (unsafePruneBoundary.isSafeToPrune || !unsafePruneBoundary.warnings.some(w => w.includes('boundaries'))) {
    throw new Error('CounterfactualReplayTester failed to catch boundary deletion violation!');
  }

  console.log('  ✅ Counterfactual Replay Tester verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 3: Operator Escalation Compressor
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 3] Testing Operator Escalation Compressor (Priority Compression)...');
  const compressor = new OperatorEscalationCompressor();

  const mockAlerts: Alert[] = [
    { id: 'a_partition', type: 'NETWORK_PARTITION', message: 'Split brain in progress', timestamp: 1000 },
    { id: 'a_timeout_1', type: 'HEARTBEAT_TIMEOUT', message: 'Timeout node 2', timestamp: 2000 }, // derivative within window
    { id: 'a_lag', type: 'REPLICA_LAG', message: 'Replica lag 500MB', timestamp: 5000 }, // derivative
    { id: 'a_slow', type: 'SLOW_QUERY', message: 'Slow query select', timestamp: 12000 }, // unrelated to network partition mappings
    { id: 'a_stall', type: 'WAL_STALL', message: 'WAL stall on standby', timestamp: 350000 }, // new root cause (outside 300s window)
    { id: 'a_timeout_2', type: 'HEARTBEAT_TIMEOUT', message: 'Timeout node 3', timestamp: 360000 } // derivative of WAL_STALL
  ];

  const narratives = compressor.compressIncidentNarrative(mockAlerts);
  console.log(`     - Raw Alerts: ${mockAlerts.length}, Compressed Narratives: ${narratives.length}`);
  for (const n of narratives) {
    console.log(`       ├─ Narrative '${n.incidentId}': root=${n.primaryRootCauseAlert.type}, derivativesCount=${n.derivativeAlertsCount}, chain=[${n.chronologicalRootCauseChain.join(' -> ')}]`);
  }

  // Expecting 3 narratives:
  // 1. NETWORK_PARTITION (suppresses HEARTBEAT_TIMEOUT @ 2000 and REPLICA_LAG @ 5000)
  // 2. SLOW_QUERY (standalone, since it's not a mapping of partition and not a root cause itself)
  // 3. WAL_STALL (suppresses HEARTBEAT_TIMEOUT @ 20000)
  if (narratives.length !== 3) {
    throw new Error('OperatorEscalationCompressor compressed incident narrative count mismatch!');
  }

  const pNarrative = narratives.find(n => n.primaryRootCauseAlert.type === 'NETWORK_PARTITION');
  if (!pNarrative || pNarrative.derivativeAlertsCount !== 2 || pNarrative.suppressedAlerts.length !== 2) {
    throw new Error('OperatorEscalationCompressor primary/derivative mapping logic incorrect!');
  }

  const stallNarrative = narratives.find(n => n.primaryRootCauseAlert.type === 'WAL_STALL');
  if (!stallNarrative || stallNarrative.derivativeAlertsCount !== 1 || stallNarrative.suppressedAlerts.length !== 1) {
    throw new Error('OperatorEscalationCompressor secondary/derivative mapping logic incorrect!');
  }

  console.log('  ✅ Operator Escalation Compressor verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 4: Dynamic Interaction Archaeologist
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 4] Testing Dynamic Interaction Archaeologist (Cascades & Deadlocks)...');
  const interactionAuditor = new DynamicInteractionArchaeologist();

  const auditEvents: TelemetryEvent[] = [
    // 1. Cascade Loop (CHECK_A -> CHECK_B -> CHECK_A -> CHECK_B -> CHECK_A within 5 seconds)
    { id: 'e1', type: 'CHECK_MEM', timestamp: 1000, entropyScore: 0.1, payload: {} },
    { id: 'e2', type: 'CHECK_GC', timestamp: 2000, entropyScore: 0.1, payload: {} },
    { id: 'e3', type: 'CHECK_MEM', timestamp: 3000, entropyScore: 0.1, payload: {} },
    { id: 'e4', type: 'CHECK_GC', timestamp: 4000, entropyScore: 0.1, payload: {} },
    { id: 'e5', type: 'CHECK_MEM', timestamp: 4500, entropyScore: 0.1, payload: {} },

    // 2. Policy Deadlock (LOCK & UNLOCK on same resource within 2 seconds)
    { id: 'e6', type: 'LOCK_REPLICA', timestamp: 10000, entropyScore: 0.2, payload: { target: 'node-standby-1' } },
    { id: 'e7', type: 'UNLOCK_REPLICA', timestamp: 11000, entropyScore: 0.2, payload: { target: 'node-standby-1' } },

    // 3. Retry Storm (>= 5 retries/backoffs)
    { id: 'e8', type: 'RETRY_WRITE', timestamp: 20000, entropyScore: 0.3, payload: { node: 'steward-1' } },
    { id: 'e9', type: 'RETRY_WRITE', timestamp: 21000, entropyScore: 0.3, payload: { node: 'steward-1' } },
    { id: 'e10', type: 'BACKOFF_DELAY', timestamp: 22000, entropyScore: 0.3, payload: { node: 'steward-2' } },
    { id: 'e11', type: 'RETRY_WRITE', timestamp: 23000, entropyScore: 0.3, payload: { node: 'steward-1' } },
    { id: 'e12', type: 'RETRY_WRITE', timestamp: 24000, entropyScore: 0.3, payload: { node: 'steward-2' } },

    // 4. Operator Override Loop (OVERRIDE -> CHECK_MEM -> OVERRIDE)
    { id: 'e13', type: 'OVERRIDE_POLICY', timestamp: 30000, entropyScore: 0.4, payload: { operator: 'sre-1' } },
    { id: 'e14', type: 'CHECK_MEM', timestamp: 31000, entropyScore: 0.1, payload: {} },
    { id: 'e15', type: 'OVERRIDE_POLICY', timestamp: 32000, entropyScore: 0.4, payload: { operator: 'sre-1' } }
  ];

  const conflictReport = interactionAuditor.auditDynamicInteractions(auditEvents);
  console.log(`     - Total Events Audited: ${conflictReport.totalEventsAudited}`);
  console.log(`     - Detected Anomalies: ${conflictReport.anomalies.length}`);
  for (const anom of conflictReport.anomalies) {
    console.log(`       ├─ [${anom.type}] severity=${anom.severity}: "${anom.description}"`);
  }

  const hasCascade = conflictReport.anomalies.some(a => a.type === 'VALIDATOR_CASCADE');
  const hasDeadlock = conflictReport.anomalies.some(a => a.type === 'POLICY_DEADLOCK');
  const hasRetryStorm = conflictReport.anomalies.some(a => a.type === 'RETRY_STORM');
  const hasOverrideLoop = conflictReport.anomalies.some(a => a.type === 'OVERRIDE_LOOP');

  if (!hasCascade || !hasDeadlock || !hasRetryStorm || !hasOverrideLoop) {
    throw new Error('DynamicInteractionArchaeologist failed to identify one or more runtime anomalies!');
  }

  console.log('  ✅ Dynamic Interaction Archaeologist verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 5: Stewardship Density Tracker
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 5] Testing Stewardship Density Tracker (Entropy Density)...');
  const densityTracker = new StewardshipDensityTracker();

  const rules: PolicyRule[] = [
    { id: 'r1', name: 'Validator A', overlapFields: ['mem', 'cpu'], conflictIndex: 0.1, triggerCount: 5, efficacyScore: 0.8 },
    { id: 'r2', name: 'Validator B', overlapFields: ['cpu', 'disk'], conflictIndex: 0.1, triggerCount: 3, efficacyScore: 0.9 }, // overlap on 'cpu'
    { id: 'r3', name: 'Validator C', overlapFields: ['disk', 'iops'], conflictIndex: 0.1, triggerCount: 12, efficacyScore: 0.95 } // overlap on 'disk' with B
  ];

  const alerts: Alert[] = [
    { id: 'a1', type: 'DISK_FULL', message: 'Disk space low', timestamp: 100 },
    { id: 'a2', type: 'WAL_STALL', message: 'WAL writes blocked', timestamp: 200 },
    { id: 'a3', type: 'REPLICA_LAG', message: 'Standby falling behind', timestamp: 300 }
  ];

  // Config: 35 parameters, playbook: 4 operator decision branches
  const densityReport = densityTracker.measureStewardshipDensity(rules, alerts, 35, 4);
  console.log(`     - Rule Interaction Count: ${densityReport.ruleInteractionCount}`);
  console.log(`     - Alert Dependency Depth: ${densityReport.alertDependencyGraphDepth}`);
  console.log(`     - Entropy Density Index: ${densityReport.entropyDensityIndex}`);
  console.log(`     - Hypertrophic Status: isHypertrophic=${densityReport.isHypertrophic}`);

  // Interactions should be:
  // r1 & r2: cpu (1)
  // r2 & r3: disk (1)
  // r1 & r3: none (0)
  // Total: 2
  if (densityReport.ruleInteractionCount !== 2) {
    throw new Error('StewardshipDensityTracker rule interaction calculation incorrect!');
  }
  if (densityReport.alertDependencyGraphDepth !== 3) {
    throw new Error('StewardshipDensityTracker alert dependency depth calculation incorrect!');
  }
  if (densityReport.entropyDensityIndex <= 0.0 || densityReport.entropyDensityIndex >= 1.0) {
    throw new Error('StewardshipDensityTracker entropy density index normalization bounds broken!');
  }

  // Trigger high density to verify hypertrophy check
  const complexRules: PolicyRule[] = Array.from({ length: 10 }, (_, idx) => ({
    id: `rule_${idx}`,
    name: `Rule ${idx}`,
    overlapFields: ['mem', 'cpu', 'disk', 'iops', 'network'],
    conflictIndex: 0.5,
    triggerCount: 10,
    efficacyScore: 0.5
  }));
  const highDensityReport = densityTracker.measureStewardshipDensity(complexRules, alerts, 80, 15);
  console.log(`     - High Density Index: ${highDensityReport.entropyDensityIndex}, isHypertrophic=${highDensityReport.isHypertrophic}`);
  if (!highDensityReport.isHypertrophic || highDensityReport.warnings.length === 0) {
    throw new Error('StewardshipDensityTracker failed to flag hypertrophy under high entropy density!');
  }

  console.log('  ✅ Stewardship Density Tracker verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 6: Stewardship Survivability Forecaster
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 6] Testing Stewardship Survivability Forecaster...');
  const forecaster = new StewardshipSurvivabilityForecaster();

  // Stable team setup
  const stableMetrics: StewardshipStaffingMetrics = {
    activeStewardsCount: 5,
    monthlyTicketVolume: 40,
    stalePlaybooksCount: 1,
    averageOnboardingDays: 30,
    monthlyOvertimeHoursPerSteward: 2
  };
  const stableReport = forecaster.forecastSurvivability(stableMetrics);
  console.log(`     - Stable: Attrition=${stableReport.attritionRiskPercent}%, Abandonment=${stableReport.abandonmentProbabilityPercent}%, Rating=${stableReport.overallStewardshipSurvivabilityRating}`);

  if (stableReport.overallStewardshipSurvivabilityRating !== 'STABLE' || stableReport.busFactorCollapse) {
    throw new Error('StewardshipSurvivabilityForecaster incorrectly flagged stable metrics as degraded/critical!');
  }

  // Attrition/Burnout/Low staff setup
  const criticalMetrics: StewardshipStaffingMetrics = {
    activeStewardsCount: 2, // low staff -> bus factor collapse
    monthlyTicketVolume: 200, // extremely high volume
    stalePlaybooksCount: 15,
    averageOnboardingDays: 90,
    monthlyOvertimeHoursPerSteward: 35 // high overtime
  };
  const criticalReport = forecaster.forecastSurvivability(criticalMetrics);
  console.log(`     - Critical: Attrition=${criticalReport.attritionRiskPercent}%, Abandonment=${criticalReport.abandonmentProbabilityPercent}%, Rating=${criticalReport.overallStewardshipSurvivabilityRating}`);
  for (const rec of criticalReport.recommendations) {
    console.log(`       └─ Recommendation: "${rec}"`);
  }

  if (criticalReport.overallStewardshipSurvivabilityRating !== 'CRITICAL' || !criticalReport.busFactorCollapse) {
    throw new Error('StewardshipSurvivabilityForecaster failed to identify critical SRE team collapse!');
  }
  if (!criticalReport.recommendations.some(r => r.includes('Bus factor'))) {
    throw new Error('StewardshipSurvivabilityForecaster recommendations missing bus factor warning!');
  }

  console.log('  ✅ Stewardship Survivability Forecaster verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 7: Experimental Destructive Simplifier
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 7] Testing Experimental Destructive Simplifier...');
  const simplifier = new DestructiveSimplifier();

  const allRules: PolicyRule[] = [
    { id: 'rule_high', name: 'Critical High Efficacy Guard', overlapFields: ['mem'], conflictIndex: 0.0, triggerCount: 100, efficacyScore: 0.85 },
    { id: 'rule_noise', name: 'Noisy Useless Policy', overlapFields: ['cpu'], conflictIndex: 0.1, triggerCount: 50, efficacyScore: 0.02 },
    { id: 'rule_conflict', name: 'Contradictory Policy', overlapFields: ['disk'], conflictIndex: 0.80, triggerCount: 10, efficacyScore: 0.40 }
  ];

  const allFields: TelemetryFieldMetadata[] = [
    { name: 'protected_latency', anomalyRarity: 0.90, causalCentrality: 0.8, recoveryContribution: 0.8, reconstructionWeight: 0.9 },
    { name: 'useless_metric', anomalyRarity: 0.05, causalCentrality: 0.05, recoveryContribution: 0.05, reconstructionWeight: 0.05 }
  ];

  const activeWidgets = ['used_latency_graph', 'unused_view_widget'];
  const widgetViews = {
    'used_latency_graph': 150,
    'unused_view_widget': 1
  };

  // Campaign 1: Safe and Successful Simplifier Campaign (Prunes noise, useless telemetry, and unused dashboard panels)
  const safeCampaign: DeletionCampaign = {
    targetPrunedRules: ['rule_noise', 'rule_conflict'],
    targetPrunedTelemetryFields: ['useless_metric'],
    targetPrunedDashboards: ['unused_view_widget']
  };

  const safeResult = simplifier.orchestrateDestructiveCampaign(safeCampaign, allRules, allFields, activeWidgets, widgetViews);
  console.log(`     - Safe Campaign: isSuccess=${safeResult.isSimplificationSuccessful}, drift=${safeResult.outcomeDriftScore}, survivability=${safeResult.replaySurvivabilityScore}, mttrDelta=${safeResult.operatorMttrDeltaSec}s`);
  for (const f of safeResult.actionableFeedback) {
    console.log(`       ├─ Feedback: "${f}"`);
  }

  // Expect successful pruning, no outcome drift, 100% survivability, and improved (negative) MTTR
  if (!safeResult.isSimplificationSuccessful || safeResult.outcomeDriftScore > 0 || safeResult.replaySurvivabilityScore !== 1.0 || safeResult.operatorMttrDeltaSec >= 0) {
    throw new Error('DestructiveSimplifier failed a safe simplification campaign!');
  }

  // Campaign 2: Harmful and Unsuccessful Campaign (Prunes critical rules, protected telemetry, and heavily used dashboards)
  const dangerousCampaign: DeletionCampaign = {
    targetPrunedRules: ['rule_high'],
    targetPrunedTelemetryFields: ['protected_latency'],
    targetPrunedDashboards: []
  };

  const dangerousResult = simplifier.orchestrateDestructiveCampaign(dangerousCampaign, allRules, allFields, activeWidgets, widgetViews);
  console.log(`     - Dangerous Campaign: isSuccess=${dangerousResult.isSimplificationSuccessful}, drift=${dangerousResult.outcomeDriftScore}, survivability=${dangerousResult.replaySurvivabilityScore}, mttrDelta=${dangerousResult.operatorMttrDeltaSec}s`);

  if (dangerousResult.isSimplificationSuccessful || dangerousResult.outcomeDriftScore === 0 || dangerousResult.replaySurvivabilityScore >= 1.0 || dangerousResult.operatorMttrDeltaSec <= 0) {
    throw new Error('DestructiveSimplifier failed to flag dangerous deletions as unsuccessful!');
  }

  console.log('  ✅ Experimental Destructive Simplifier verified.\n');

  console.log('================================================================================');
  console.log('🎉  ALL ZTAN PHASE 23 VERIFICATION DRILLS COMPLETED SUCCESSFULLY!');
  console.log('================================================================================');
}

runPhase23Verification().catch(err => {
  console.error('\n❌  VERIFICATION FAILURE DETECTED:');
  console.error(err);
  process.exit(1);
});
