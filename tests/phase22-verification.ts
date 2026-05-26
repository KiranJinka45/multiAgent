import dotenv from 'dotenv';
dotenv.config();

import {
  EvidenceReductionEnforcer,
  ReplayMinimalist,
  OperatorLoadReducer,
  GovernanceShrinker,
  RuntimeToGovernanceRatioTracker,
  StewardshipMaintainabilityAuditor,
  TelemetryEvent,
  Alert,
  PolicyRule,
  MaintenanceMetrics
} from '../packages/runtime-core/src/index';

async function runPhase22Verification() {
  console.log('================================================================================');
  console.log('🧪  ZTAN PHASE 22 — STEWARDSHIP REDUCTION & OPERATIONAL CONVERGENCE RUNNER');
  console.log('================================================================================\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 1: Evidence Reduction Enforcer
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 1] Testing Evidence Reduction Enforcer (Telemetry Pruning & Quotas)...');
  const reductionEnforcer = new EvidenceReductionEnforcer();

  const registeredFields = ['cpu_usage', 'memory_usage', 'unused_metric_a', 'unused_metric_b', 'db_latency'];
  const queryFrequency = {
    'cpu_usage': 100,
    'memory_usage': 80,
    'db_latency': 20,
    'unused_metric_a': 1, // very low frequency (1 / 202 = 0.0049 < 0.05)
    'unused_metric_b': 0  // 0 frequency < 0.05
  };

  const pruningReport = reductionEnforcer.evaluateTelemetryPruning(registeredFields, queryFrequency);
  console.log(`     - Total Fields: ${pruningReport.totalFields}`);
  console.log(`     - Recommended Retirements: ${JSON.stringify(pruningReport.recommendedRetirements)}`);
  console.log(`     - Utility Scores: ${JSON.stringify(pruningReport.fieldUtilityScores)}`);

  if (pruningReport.totalFields !== 5) {
    throw new Error('EvidenceReductionEnforcer total field evaluation count mismatch!');
  }
  if (!pruningReport.recommendedRetirements.includes('unused_metric_a') || !pruningReport.recommendedRetirements.includes('unused_metric_b')) {
    throw new Error('EvidenceReductionEnforcer failed to identify low-utility fields for retirement!');
  }
  if (pruningReport.recommendedRetirements.includes('cpu_usage')) {
    throw new Error('EvidenceReductionEnforcer incorrectly flagged high-utility metric for retirement!');
  }

  // Quota enforcement test (2:1 ratio)
  const quotaCompliant = reductionEnforcer.enforceDeletionQuota(2, 4); // 2 new fields, 4 retired -> Compliant
  const quotaViolated = reductionEnforcer.enforceDeletionQuota(2, 3);   // 2 new fields, 3 retired -> Violating

  console.log(`     - Quota Compliant: isCompliant=${quotaCompliant.isCompliant}, required=${quotaCompliant.requiredDeletions}, surplus=${quotaCompliant.surplus}`);
  console.log(`     - Quota Violated: isCompliant=${quotaViolated.isCompliant}, required=${quotaViolated.requiredDeletions}, surplus=${quotaViolated.surplus}`);

  if (!quotaCompliant.isCompliant || quotaCompliant.surplus !== 0) {
    throw new Error('EvidenceReductionEnforcer failed to validate a compliant 2:1 deletion quota!');
  }
  if (quotaViolated.isCompliant || quotaViolated.surplus !== -1) {
    throw new Error('EvidenceReductionEnforcer failed to flag non-compliance under 2:1 deletion quota!');
  }

  console.log('  ✅ Evidence Reduction Enforcer verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 2: Replay Minimalist (Minimum Viable Forensic Surface - MVFS)
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 2] Testing Replay Minimalist (Minimum Viable Forensic Surface)...');
  const minimalist = new ReplayMinimalist();

  const mockEvents: TelemetryEvent[] = [
    { id: 'ev_start', type: 'STARTUP', timestamp: 1000, entropyScore: 0.1, payload: {} },
    { id: 'ev_poll_1', type: 'HEARTBEAT', timestamp: 1100, entropyScore: 0.02, payload: { value: 'ok' } },
    { id: 'ev_poll_2', type: 'HEARTBEAT', timestamp: 1200, entropyScore: 0.02, payload: { value: 'ok' } },
    { id: 'ev_critical_transition', type: 'ACQUIRE_LEASE', timestamp: 1300, entropyScore: 0.2, payload: { node: 'steward-1' } }, // critical keyword 'lease'
    { id: 'ev_anomaly', type: 'INVARIANT_DEVIATION', timestamp: 1400, entropyScore: 0.65, payload: { drift: 5.5 } }, // entropy >= 0.50
    { id: 'ev_poll_3', type: 'HEARTBEAT', timestamp: 1500, entropyScore: 0.02, payload: { value: 'ok' } },
    { id: 'ev_end', type: 'SHUTDOWN', timestamp: 1600, entropyScore: 0.1, payload: {} } // boundary and critical keyword 'shutdown'
  ];

  const mvfs = minimalist.computeMinimumViableForensicSurface(mockEvents);
  console.log(`     - Reduced event stream size: ${mockEvents.length} -> ${mvfs.length}`);
  console.log(`     - Remaining events: ${mvfs.map(e => e.id).join(', ')}`);

  // MVFS should retain boundaries (ev_start, ev_end), critical actions (ev_critical_transition, ev_end), anomalies (ev_anomaly)
  // Heartbeats (ev_poll_1, ev_poll_2, ev_poll_3) should be discarded.
  const retainedIds = new Set(mvfs.map(e => e.id));

  if (!retainedIds.has('ev_start') || !retainedIds.has('ev_end')) {
    throw new Error('ReplayMinimalist MVFS failed to retain boundary events!');
  }
  if (!retainedIds.has('ev_critical_transition')) {
    throw new Error('ReplayMinimalist MVFS failed to retain critical state-machine actions!');
  }
  if (!retainedIds.has('ev_anomaly')) {
    throw new Error('ReplayMinimalist MVFS failed to retain high-entropy anomaly events!');
  }
  if (retainedIds.has('ev_poll_1') || retainedIds.has('ev_poll_2') || retainedIds.has('ev_poll_3')) {
    throw new Error('ReplayMinimalist MVFS failed to discard redundant polling/heartbeat events!');
  }

  console.log('  ✅ Replay Minimalist verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 3: Operator Load Reducer
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 3] Testing Operator Load Reducer (Alert Collapsing & Dashboard Pruning)...');
  const loadReducer = new OperatorLoadReducer();

  const mockAlerts: Alert[] = [
    { id: 'a1', type: 'DISK_SLOW', message: 'Disk read delay', timestamp: 10000 },
    { id: 'a2', type: 'DISK_SLOW', message: 'Disk read delay', timestamp: 20000 }, // same window (10s diff < 300s)
    { id: 'a3', type: 'HEAP_HIGH', message: 'Heap above 80%', timestamp: 30000 },
    { id: 'a4', type: 'DISK_SLOW', message: 'Disk read delay', timestamp: 40000 }, // same window
    { id: 'a5', type: 'DISK_SLOW', message: 'Disk read delay', timestamp: 350000 } // outside window
  ];

  const collapsedAlerts = loadReducer.collapseAlerts(mockAlerts);
  console.log(`     - Original Alerts: ${mockAlerts.length}, Collapsed: ${collapsedAlerts.length}`);
  for (const c of collapsedAlerts) {
    console.log(`       ├─ [${c.type}] lastTimestamp=${c.timestamp}, count=${c.duplicateCount}, collapsedIds=[${c.collapsedIds.join(', ')}]`);
  }

  if (collapsedAlerts.length !== 3) {
    throw new Error('OperatorLoadReducer collapsed alert count mismatch!');
  }
  const mainDiskSlow = collapsedAlerts.find(a => a.id === 'a1');
  if (!mainDiskSlow || mainDiskSlow.duplicateCount !== 3 || !mainDiskSlow.collapsedIds.includes('a2') || !mainDiskSlow.collapsedIds.includes('a4')) {
    throw new Error('OperatorLoadReducer alert window merging logic incorrect!');
  }

  // Dashboard pruning test
  const activeWidgets = ['latency_graph', 'cpu_meter', 'wal_depth', 'unused_metric_panel'];
  const widgetViews = {
    'latency_graph': 120,
    'cpu_meter': 85,
    'wal_depth': 4,      // Viewed less than 5 times
    'unused_metric_panel': 0 // Viewed less than 5 times
  };

  const dashboardResult = loadReducer.simplifyDashboardComplexity(activeWidgets, widgetViews);
  console.log(`     - Active widgets: ${dashboardResult.currentWidgetCount}`);
  console.log(`     - Recommended pruning: ${JSON.stringify(dashboardResult.recommendedPruning)}`);
  console.log(`     - Target widget count: ${dashboardResult.targetWidgetCount}`);

  if (dashboardResult.recommendedPruning.length !== 2) {
    throw new Error('OperatorLoadReducer simplified dashboard pruning count mismatch!');
  }
  if (!dashboardResult.recommendedPruning.includes('wal_depth') || !dashboardResult.recommendedPruning.includes('unused_metric_panel')) {
    throw new Error('OperatorLoadReducer failed to recommend pruning of low-view widgets!');
  }

  console.log('  ✅ Operator Load Reducer verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 4: Governance Shrinker
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 4] Testing Governance Shrinker (Redundancy, Conflicts & Efficacy)...');
  const shrinker = new GovernanceShrinker();

  const rules: PolicyRule[] = [
    {
      id: 'rule1',
      name: 'CPU Throttle Policy',
      overlapFields: ['cpu', 'load', 'steal'],
      conflictIndex: 0.1,
      triggerCount: 15,
      efficacyScore: 0.05 // High triggers, very low efficacy -> Noise
    },
    {
      id: 'rule2',
      name: 'Memory OOM Safeguard',
      overlapFields: ['mem', 'swap'],
      conflictIndex: 0.8, // Contradicts too frequently (conflict >= 0.70)
      triggerCount: 5,
      efficacyScore: 0.5
    },
    {
      id: 'rule3',
      name: 'Disk Write Limits',
      overlapFields: ['disk_write', 'iops'],
      conflictIndex: 0.1,
      triggerCount: 50,
      efficacyScore: 0.9
    },
    {
      id: 'rule4',
      name: 'Duplicate Disk Write Limits',
      overlapFields: ['disk_write'], // 100% overlap with rule3 fields
      conflictIndex: 0.1,
      triggerCount: 20,
      efficacyScore: 0.85
    }
  ];

  const recommendations = shrinker.auditRuleRedundancy(rules);
  console.log(`     - Audit Recommendations: ${recommendations.length}`);
  for (const rec of recommendations) {
    console.log(`       ├─ [${rec.severity}] Rule '${rec.ruleName}' (${rec.ruleId}): "${rec.reason}"`);
  }

  const rec1 = recommendations.find(r => r.ruleId === 'rule1');
  const rec2 = recommendations.find(r => r.ruleId === 'rule2');
  const rec4 = recommendations.find(r => r.ruleId === 'rule4');

  if (!rec1 || rec1.severity !== 'HIGH' || !rec1.reason.includes('noise')) {
    throw new Error('GovernanceShrinker failed to flag low-efficacy high-trigger rule as Noise!');
  }
  if (!rec2 || rec2.severity !== 'MEDIUM' || !rec2.reason.includes('contradicts')) {
    throw new Error('GovernanceShrinker failed to flag high conflict index rule!');
  }
  if (!rec4 || rec4.severity !== 'LOW' || !rec4.reason.includes('Redundant')) {
    throw new Error('GovernanceShrinker failed to flag high-overlap rule as Redundant!');
  }

  console.log('  ✅ Governance Shrinker verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 5: Runtime-to-Governance LOC Ratio Tracker
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 5] Testing Runtime-to-Governance LOC Ratio Tracker...');
  const tracker = new RuntimeToGovernanceRatioTracker();

  // Compliant: 10000 lines of runtime code, 1000 lines of governance (10% <= 15%)
  const reportCompliant = tracker.evaluateCodebaseRatio(10000, 1000);
  // Violating: 10000 lines of runtime code, 2000 lines of governance (20% > 15%)
  const reportViolated = tracker.evaluateCodebaseRatio(10000, 2000);

  console.log(`     - Compliant: isCompliant=${reportCompliant.isCompliant}, percent=${(reportCompliant.governancePercentage * 100).toFixed(1)}%, surplus=${reportCompliant.surplusLoc}`);
  console.log(`     - Violated: isCompliant=${reportViolated.isCompliant}, percent=${(reportViolated.governancePercentage * 100).toFixed(1)}%, surplus=${reportViolated.surplusLoc}`);
  if (reportViolated.error) {
    console.log(`       └─ Error Message: "${reportViolated.error}"`);
  }

  if (!reportCompliant.isCompliant || reportCompliant.surplusLoc !== 0 || reportCompliant.governancePercentage !== 0.10) {
    throw new Error('RuntimeToGovernanceRatioTracker compliance check incorrect!');
  }
  if (reportViolated.isCompliant || reportViolated.surplusLoc !== 500 || reportViolated.governancePercentage !== 0.20) {
    throw new Error('RuntimeToGovernanceRatioTracker failed to check hypertrophy threshold!');
  }
  if (!reportViolated.error || !reportViolated.error.includes('Governance Hypertrophy alert')) {
    throw new Error('RuntimeToGovernanceRatioTracker error message missing or incorrectly formatted!');
  }

  console.log('  ✅ Runtime-to-Governance LOC Ratio Tracker verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 6: Stewardship Maintainability Auditor
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 6] Testing Stewardship Maintainability Auditor...');
  const auditor = new StewardshipMaintainabilityAuditor();

  const baseTimestamp = Date.now();
  const oneMonthMs = 1000 * 60 * 60 * 24 * 30;

  const history: MaintenanceMetrics[] = [];
  for (let i = 0; i < 4; i++) {
    history.push({
      timestamp: baseTimestamp + (i * oneMonthMs),
      governanceFileCount: 10 + i * 2,
      complexityScore: 100 + i * 15,          // Slope: 15 per month
      unactionableAlertsCount: 5 + i * 6,     // Slope: 6 per month (> 5.0 -> hypertrophy)
      maintenanceEffortHours: 10 + i * 3      // Slope: 3 per month (> 2.0 -> hypertrophy)
    });
  }

  const report = auditor.evaluateMaintenanceCostSlope(history);
  if (!report) {
    throw new Error('StewardshipMaintainabilityAuditor report was unexpectedly null!');
  }

  console.log(`     - Slopes per month: complexityGrowth=${report.complexityGrowthSlopePerMonth}, alertFatigue=${report.alertFatigueTrendPerMonth}, effortHours=${report.maintenanceEffortSlopePerMonth}`);
  console.log(`     - Hypertrophy Detected: ${report.stewardshipHypertrophyDetected}`);
  console.log(`     - Recommendations: ${JSON.stringify(report.recommendations)}`);

  // Verify slope values
  if (Math.abs(report.complexityGrowthSlopePerMonth - 15) > 0.1 ||
      Math.abs(report.alertFatigueTrendPerMonth - 6) > 0.1 ||
      Math.abs(report.maintenanceEffortSlopePerMonth - 3) > 0.1) {
    throw new Error('StewardshipMaintainabilityAuditor linear slope calculations incorrect!');
  }

  if (!report.stewardshipHypertrophyDetected) {
    throw new Error('StewardshipMaintainabilityAuditor failed to flag hypertrophy on high slopes!');
  }
  if (report.recommendations.length !== 2) {
    throw new Error('StewardshipMaintainabilityAuditor failed to generate correct number of recommendations!');
  }

  console.log('  ✅ Stewardship Maintainability Auditor verified.\n');

  console.log('================================================================================');
  console.log('🎉  ALL ZTAN PHASE 22 VERIFICATION DRILLS COMPLETED SUCCESSFULLY!');
  console.log('================================================================================');
}

runPhase22Verification().catch(err => {
  console.error('\n❌  VERIFICATION FAILURE DETECTED:');
  console.error(err);
  process.exit(1);
});
