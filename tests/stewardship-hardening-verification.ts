import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import {
  TelemetryNegativeGrowthEnforcer,
  EvidenceCompactor,
  OperatorCognitionAuditor,
  CompactorEvent,
  ReplayTrace
} from '../packages/runtime-core/src/index';

async function runStewardshipHardeningVerification() {
  console.log('================================================================================');
  console.log('🧪  ZTAN REALISM HARDENING & COMPACTION OBSERVABILITY RUNNER');
  console.log('================================================================================\n');

  const workspaceRoot = process.cwd();

  // ────────────────────────────────────────────────────────────────────────
  // TEST 1: Telemetry Negative Growth Enforcer
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 1] Auditing Telemetry Negative Growth & Consolidation...');
  const enforcer = new TelemetryNegativeGrowthEnforcer(15, 5);

  // Validate within limits
  const reportOk = enforcer.validateTelemetryLimit(10, 4);
  console.log(`     - Under bounds check: isValid=${reportOk.isValid}, metrics=${reportOk.activeMetricsCount}/${reportOk.metricCeiling}`);
  if (!reportOk.isValid) {
    throw new Error('Valid telemetry limit flagged as invalid!');
  }

  // Validate exceeding limits
  const reportOver = enforcer.validateTelemetryLimit(20, 6);
  console.log(`     - Over bounds check: isValid=${reportOver.isValid}, error="${reportOver.error}"`);
  if (reportOver.isValid || !reportOver.error) {
    throw new Error('Telemetry expansion failed to trigger negative growth enforcement!');
  }

  // Verify metric consolidation
  const rawMetrics: Record<string, number[]> = {
    'cpu_util': [12.5, 15.0, 11.2, 45.3, 14.1],
    'heap_growth_mb': [102, 104, 105, 107, 105]
  };
  const consolidated = enforcer.consolidateTelemetry(rawMetrics);
  console.log(`     - Consolidating cpu_util: min=${consolidated.cpu_util.min}%, max=${consolidated.cpu_util.max}%, avg=${consolidated.cpu_util.avg}%`);
  console.log(`     - Consolidating heap_growth_mb: min=${consolidated.heap_growth_mb.min}MB, max=${consolidated.heap_growth_mb.max}MB, avg=${consolidated.heap_growth_mb.avg}MB`);

  if (consolidated.cpu_util.avg !== 19.62 || consolidated.heap_growth_mb.avg !== 104.6) {
    throw new Error('Metric consolidation average values incorrect!');
  }
  console.log('  ✅ Telemetry Negative Growth & Consolidation verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 2: Evidence Compactor (Causality Collapse & Forensic Sampling)
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 2] Auditing Causality Collapse & Forensic Sampling rules...');
  const compactor = new EvidenceCompactor(workspaceRoot);

  const rawEvents: CompactorEvent[] = [
    { timestampIso: '2026-05-25T12:00:00Z', type: 'HEARTBEAT', status: 'NOMINAL' },
    { timestampIso: '2026-05-25T12:01:00Z', type: 'HEARTBEAT', status: 'NOMINAL' },
    { timestampIso: '2026-05-25T12:02:00Z', type: 'HEARTBEAT', status: 'NOMINAL' },
    { timestampIso: '2026-05-25T12:03:00Z', type: 'FENCE_REJECT', status: 'ANOMALOUS', details: { reason: 'stale epoch' } },
    { timestampIso: '2026-05-25T12:04:00Z', type: 'HEARTBEAT', status: 'NOMINAL' },
    { timestampIso: '2026-05-25T12:05:00Z', type: 'HEARTBEAT', status: 'NOMINAL' }
  ];

  const collapsed = compactor.causalityCollapseHeuristics(rawEvents);
  console.log(`     - Original event count: ${rawEvents.length}`);
  console.log(`     - Collapsed event count: ${collapsed.length}`);
  console.log(`     - First event after collapse type: ${collapsed[0].type} (Status: ${collapsed[0].status}, count: ${collapsed[0].details?.collapsedCount})`);
  console.log(`     - Middle anomaly event: ${collapsed[1].type} (Status: ${collapsed[1].status})`);

  if (collapsed.length !== 3 || collapsed[0].type !== 'CAUSAL_COLLAPSE_SUMMARY' || collapsed[0].details?.collapsedCount !== 3) {
    throw new Error('Causality collapse heuristics failed to merge linear nominal chains!');
  }

  // Test Forensic Sampling
  const rawSnapshots = [
    { index: 0, trustStatus: 'VERIFIED' },
    { index: 1, trustStatus: 'VERIFIED' },
    { index: 2, trustStatus: 'VERIFIED' },
    { index: 3, trustStatus: 'UNTRUSTED' }, // Anomalous
    { index: 4, trustStatus: 'VERIFIED' },
    { index: 5, trustStatus: 'VERIFIED' },
    { index: 6, trustStatus: 'VERIFIED' },
    { index: 7, trustStatus: 'VERIFIED' }
  ];

  const sampledSnapshots = compactor.forensicSamplingRules(rawSnapshots, 3);
  console.log(`     - Raw snapshots count: ${rawSnapshots.length}`);
  console.log(`     - Sampleed snapshots count: ${sampledSnapshots.length}`);
  
  const hasUntrusted = sampledSnapshots.some(s => s.trustStatus === 'UNTRUSTED');
  console.log(`     - Sampled contains anomalous snapshot: ${hasUntrusted}`);

  if (sampledSnapshots.length !== 4 || !hasUntrusted) {
    throw new Error('Forensic sampling rules failed to preserve anomalous state boundary!');
  }
  console.log('  ✅ Causality Collapse & Forensic Sampling verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 3: Retention Tiering & Replay Summarization
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 3] Auditing Retention Tiering & Replay Summarization...');

  const hotVault = path.resolve(workspaceRoot, '.ztan', 'evidence-vault');
  if (!fs.existsSync(hotVault)) {
    fs.mkdirSync(hotVault, { recursive: true });
  }

  // Create temporary old files
  const fileOld1 = path.join(hotVault, 'metric-old-1.json');
  const fileOld2 = path.join(hotVault, 'metric-old-2.json');
  const fileNew = path.join(hotVault, 'metric-new.json');
  const fileProtected = path.join(hotVault, 'incident-protected-1.json');

  fs.writeFileSync(fileOld1, JSON.stringify({ data: 'old1' }), 'utf8');
  fs.writeFileSync(fileOld2, JSON.stringify({ data: 'old2' }), 'utf8');
  fs.writeFileSync(fileNew, JSON.stringify({ data: 'new' }), 'utf8');
  fs.writeFileSync(fileProtected, JSON.stringify({ data: 'protected_old' }), 'utf8');

  // Set modification time (old files are 2 days old)
  const oldTime = Date.now() - (2 * 24 * 60 * 60 * 1000);
  fs.utimesSync(fileOld1, new Date(oldTime), new Date(oldTime));
  fs.utimesSync(fileOld2, new Date(oldTime), new Date(oldTime));
  fs.utimesSync(fileProtected, new Date(oldTime), new Date(oldTime));

  // Run tiering with maxAge of 1 day (should archive fileOld1 and fileOld2, leave fileNew and fileProtected)
  const tieringReport = await compactor.retentionTiering(24 * 60 * 60 * 1000);
  console.log(`     - Archived count: ${tieringReport.archivedCount} files`);
  console.log(`     - Hot size after tiering: ${tieringReport.hotSize} bytes`);
  console.log(`     - Cold size generated: ${tieringReport.coldSize} bytes`);

  const old1Exists = fs.existsSync(fileOld1);
  const old2Exists = fs.existsSync(fileOld2);
  const newExists = fs.existsSync(fileNew);
  const protectedExists = fs.existsSync(fileProtected);

  console.log(`     - Old file 1 pruned from hot: ${!old1Exists}`);
  console.log(`     - Old file 2 pruned from hot: ${!old2Exists}`);
  console.log(`     - New file retained in hot: ${newExists}`);
  console.log(`     - Protected incident file retained: ${protectedExists}`);

  // Cleanup temp files
  if (fs.existsSync(fileNew)) fs.unlinkSync(fileNew);
  if (fs.existsSync(fileProtected)) fs.unlinkSync(fileProtected);

  // Clean cold folder files
  const coldDir = path.join(hotVault, 'cold_archive');
  if (fs.existsSync(coldDir)) {
    const coldFiles = fs.readdirSync(coldDir);
    for (const f of coldFiles) {
      fs.unlinkSync(path.join(coldDir, f));
    }
    fs.rmdirSync(coldDir);
  }

  if (old1Exists || old2Exists || !newExists || !protectedExists || tieringReport.archivedCount !== 2) {
    throw new Error('Retention tiering and cold archive mechanics failed!');
  }

  // Verify Replay Summarization
  const rawReplayHistory: ReplayTrace[] = [
    { seqId: 1, action: 'ACQUIRE_LEASE', prevStatus: 'IDLE', currentStatus: 'RUNNING', diverged: false },
    { seqId: 2, action: 'HEARTBEAT', prevStatus: 'RUNNING', currentStatus: 'RUNNING', diverged: false },
    { seqId: 3, action: 'COMMIT_BLOCK', prevStatus: 'RUNNING', currentStatus: 'RUNNING', diverged: false },
    { seqId: 4, action: 'REPLICATE_LOG', prevStatus: 'RUNNING', currentStatus: 'RUNNING', diverged: true, error: 'replica mismatch' },
    { seqId: 5, action: 'RELEASE_LEASE', prevStatus: 'RUNNING', currentStatus: 'STOPPED', diverged: false }
  ];

  const summarizedReplay = compactor.replaySummarization(rawReplayHistory);
  console.log(`     - Raw replay trace count: ${rawReplayHistory.length}`);
  console.log(`     - Summarized replay trace count: ${summarizedReplay.length}`);
  for (const trace of summarizedReplay) {
    console.log(`       └─ SeqId ${trace.seqId}: Action=${trace.action}, Diverged=${trace.diverged}, Prev=${trace.prevStatus}, Curr=${trace.currentStatus}`);
  }

  if (summarizedReplay.length !== 3 || summarizedReplay[1].action !== 'REPLICATE_LOG') {
    throw new Error('Replay summarization failed to preserve state transitions and diverged fault states!');
  }
  console.log('  ✅ Retention Tiering & Replay Summarization verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 4: SRE Operator Cognition & Fatigue Audits
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 4] Auditing SRE Operator Cognition & Fatigue metrics...');
  const cogAuditor = new OperatorCognitionAuditor();

  // Test 4.1 Playbook response confusion (Perfect compliance vs slightly confused vs extremely confused)
  const standardPlaybook = ['FENCE_STALE', 'RECONCILE_EPOCH', 'REPLAY_LOG', 'RESUME_LEASES'];
  const compliantActions = ['FENCE_STALE', 'RECONCILE_EPOCH', 'REPLAY_LOG', 'RESUME_LEASES'];
  const confusedActions  = ['REPLAY_LOG', 'FENCE_STALE', 'RECONCILE_EPOCH', 'RESUME_LEASES']; // out of order
  const lostActions      = ['FORCE_STOP_ALL', 'BYPASS_CONSENSUS']; // dangerous/different

  const scoreCompliant = cogAuditor.measureResponseConfusion(compliantActions, standardPlaybook);
  const scoreConfused  = cogAuditor.measureResponseConfusion(confusedActions, standardPlaybook);
  const scoreLost      = cogAuditor.measureResponseConfusion(lostActions, standardPlaybook);

  console.log(`     - Playbook confusion (Compliant): ${scoreCompliant}%`);
  console.log(`     - Playbook confusion (Confused):  ${scoreConfused}%`);
  console.log(`     - Playbook confusion (Bypass):    ${scoreLost}%`);

  if (scoreCompliant !== 0 || scoreConfused <= scoreCompliant || scoreLost < scoreConfused) {
    throw new Error('Operator response playbook confusion scoring failed!');
  }

  // Test 4.2 Forensic reconstruction latency
  const latencyScoreNominal = cogAuditor.calculateArchaeologyReconstructionLatency(10, 3, 40); // 10 traces, 3 queries, 40 secs (fast)
  const latencyScoreFatigue = cogAuditor.calculateArchaeologyReconstructionLatency(10, 3, 250); // 10 traces, 3 queries, 250 secs (slow/fatigued)
  console.log(`     - Nom reconstruction score: ${latencyScoreNominal}%`);
  console.log(`     - Fatigued reconstruction score: ${latencyScoreFatigue}%`);

  if (latencyScoreNominal >= 60 || latencyScoreFatigue !== 100) {
    throw new Error('Forensic reconstruction latency calculations out of expected bounds!');
  }

  // Test 4.3 Dashboard visual overload
  const overloadScoreNominal = cogAuditor.scoreDashboardOverload(2, 30, 8); // 2 alerts, 30s res, 8 panels
  const overloadScoreCritical = cogAuditor.scoreDashboardOverload(15, 1, 35); // 15 alerts, 1s res, 35 panels
  console.log(`     - Nominal dashboard overload index: ${overloadScoreNominal}%`);
  console.log(`     - Critical dashboard overload index: ${overloadScoreCritical}%`);

  if (overloadScoreNominal >= 30 || overloadScoreCritical < 80) {
    throw new Error('Dashboard visual overload metrics calculation failed!');
  }

  // Test 4.4 Alert Fatigue & MTTR response efficiency
  const fatigueScoreClean = cogAuditor.scoreFalsePositiveFatigue(10, 9); // 10 alerts, 9 actionable
  const fatigueScoreNoisy = cogAuditor.scoreFalsePositiveFatigue(100, 5); // 100 alerts, 5 actionable
  console.log(`     - Nominal alert fatigue: ${fatigueScoreClean}%`);
  console.log(`     - Noisy alert fatigue:   ${fatigueScoreNoisy}%`);

  const mttrScoreFast = cogAuditor.evaluateTimeToRootCause(50000, 100000); // 150 seconds total
  const mttrScoreSlow = cogAuditor.evaluateTimeToRootCause(1200000, 600000); // 30 minutes total
  console.log(`     - Fast response score: ${mttrScoreFast}`);
  console.log(`     - Slow response score: ${mttrScoreSlow}`);

  if (fatigueScoreNoisy !== 95 || mttrScoreFast >= 40 || mttrScoreSlow < 80) {
    throw new Error('False positive fatigue or Time-to-Root-Cause scoring failed!');
  }

  // Generate holistic report
  const finalReport = cogAuditor.generateReport(
    confusedActions,
    standardPlaybook,
    10, 3, 200, // incident reconstruction
    12, 2, 25,  // dashboard metrics
    80, 20,     // alert counts
    300000, 150000 // mttr
  );
  console.log(`     - Holistic Operator Cognition Report:`);
  console.log(`       ├─ Confusion Score:        ${finalReport.confusionScore}%`);
  console.log(`       ├─ Reconstruction Latency: ${finalReport.reconstructionScore}%`);
  console.log(`       ├─ Dashboard Overload:     ${finalReport.overloadIndex}%`);
  console.log(`       ├─ Alert Fatigue:          ${finalReport.fatigueScore}%`);
  console.log(`       ├─ Time-to-Root-Cause:     ${finalReport.timeToRootCauseScore}`);
  console.log(`       └─ OVERALL COGNITIVE LOAD:  ${finalReport.overallCognitiveLoad}%`);

  if (finalReport.overallCognitiveLoad < 50 || finalReport.overallCognitiveLoad > 90) {
    throw new Error('Overall cognitive load calculation yields unexpected value!');
  }
  console.log('  ✅ SRE Operator Cognition & Fatigue audits verified.\n');

  console.log('================================================================================');
  console.log('🎉 ALL HARDENING & COMPACTION VERIFICATION DRILLS PASSED SUCCESSFULLY');
  console.log('================================================================================');
  process.exit(0);
}

runStewardshipHardeningVerification().catch(err => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
