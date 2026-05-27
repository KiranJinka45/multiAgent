import dotenv from 'dotenv';
dotenv.config();

import {
  KernelPathologyHarness,
  PostgresPhysicalArchaeologist,
  MultiDaySoakCoordinator,
  ReplayCompressor,
  OperatorExplainabilityEngine,
  RealWorldEconomicsDatabase
} from '../packages/runtime-core/src/index';

async function runPhase20Verification() {
  console.log('================================================================================');
  console.log('🧪  ZTAN PHASE 20 — PHYSICAL REALITY & INFRASTRUCTURE EXPOSURE RUNNER');
  console.log('================================================================================\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 1: Linux Kernel Pathology Harness
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 1] Testing Kernel Pathology Harness Command Generation...');
  const harness = new KernelPathologyHarness('eth0');

  // Network Pathology
  await harness.applyNetworkPathology({
      packetCorruptionPercent: 5,
      jitterMs: 20,
      reorderPercent: 10,
      duplicateAckStorm: true,
      mtuMismatch: 1400
  });

  // cgroup Starvation
  await harness.applyCgroupPathology({
      cpuStarvationPercent: 30,
      memoryLimitMb: 1024,
      schedulerContention: true
  });

  // Storage Pathology
  await harness.applyStoragePathology({
      fsyncDelayMs: 150,
      diskSaturation: true,
      dirtyPageExhaustion: true
  });

  const commands = harness.getExecutedCommands();
  console.log(`     - Generated ${commands.length} kernel injection commands.`);

  // Asserting expected commands are queued/executed
  const hasNetem = commands.some(c => c.includes('tc qdisc add dev eth0 root netem') && c.includes('corrupt 5%') && c.includes('delay 20ms') && c.includes('reorder 10%'));
  const hasMtu = commands.some(c => c.includes('ip link set dev eth0 mtu 1400'));
  const hasCgroup = commands.some(c => c.includes('cgcreate') && c.includes('ztan_cgroup'));
  const hasCpuShares = commands.some(c => c.includes('cgset -r cpu.shares=717'));
  const hasMemoryLimit = commands.some(c => c.includes('cgset -r memory.limit_in_bytes=1073741824'));
  const hasHdp = commands.some(c => c.includes('hdparm -W 0'));
  const hasSat = commands.some(c => c.includes('dd if=/dev/zero of=/tmp/ztan_saturation_test'));
  const hasDirtyRatio = commands.some(c => c.includes('sysctl -w vm.dirty_ratio=5'));

  if (!hasNetem || !hasMtu || !hasCgroup || !hasCpuShares || !hasMemoryLimit || !hasHdp || !hasSat || !hasDirtyRatio) {
      console.error('Commands logged:', commands);
      throw new Error('Kernel pathology command serialization failed or parameter computation incorrect!');
  }

  // Clear pathologies
  await harness.clearAllPathologies();
  const clearedCommands = harness.getExecutedCommands();
  const hasNetemDel = clearedCommands.some(c => c.includes('tc qdisc del dev eth0 root'));
  const hasMtuReset = clearedCommands.some(c => c.includes('ip link set dev eth0 mtu 1500'));
  const hasCgroupDel = clearedCommands.some(c => c.includes('cgdelete -r cpu,memory,blkio:/ztan_cgroup'));

  if (!hasNetemDel || !hasMtuReset || !hasCgroupDel) {
      throw new Error('Failed to correctly serialize pathology clear/cleanup commands!');
  }

  console.log('  ✅ Kernel Pathology Harness verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 2: PostgreSQL Physical Failure Archaeology
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 2] Testing PostgreSQL Physical Failure Archaeology...');
  const pgArch = new PostgresPhysicalArchaeologist(15);

  // WAL Corruption Check
  const validWal = Buffer.alloc(32);
  validWal.writeUInt16BE(0xD071, 0); // valid magic
  const walReportOk = pgArch.diagnoseWalCorruption('000000010000000000000001', validWal);
  console.log(`     - Valid WAL Check: isValid=${walReportOk.isValid}, risk=${walReportOk.riskLevel}`);
  if (!walReportOk.isValid) {
      throw new Error('Valid WAL buffer failed integrity check!');
  }

  const corruptWal = Buffer.alloc(16); // wrong magic
  const walReportErr = pgArch.diagnoseWalCorruption('000000010000000000000002', corruptWal);
  console.log(`     - Corrupt WAL Check: isValid=${walReportErr.isValid}, risk=${walReportErr.riskLevel}, action=${walReportErr.reconciliationAction}`);
  if (walReportErr.isValid || walReportErr.riskLevel !== 'CRITICAL') {
      throw new Error('Corrupted magic bytes in WAL failed to flag as Critical!');
  }

  // Replica Divergence Lag Check
  const masterLsn = '0/16A2F40';
  const replicaLsn = '0/1500000'; // lag is 0x1A2F40 = 1716032 bytes
  const divReport = pgArch.simulateReplicaDivergence(masterLsn, replicaLsn, 1, 1);
  console.log(`     - Replica Divergence Check: isDiverged=${divReport.isDiverged}, lagBytes=${divReport.lagBytes}, state=${divReport.reconciliationState}`);
  if (!divReport.isDiverged || divReport.lagBytes !== 1716032 || divReport.reconciliationState !== 'CLEAN') {
      throw new Error('Replica divergence LSN parser or lag calculations incorrect!');
  }

  const splitTimelineReport = pgArch.simulateReplicaDivergence(masterLsn, replicaLsn, 2, 1);
  console.log(`     - Split Timeline Check: isDiverged=${splitTimelineReport.isDiverged}, state=${splitTimelineReport.reconciliationState}`);
  if (splitTimelineReport.reconciliationState !== 'REWINNING_REQUIRED') {
      throw new Error('Replica timeline divergence failed to flag as REWINNING_REQUIRED!');
  }

  // Replication Slot Exhaustion Check
  const slotReport = pgArch.checkReplicationSlots(12);
  console.log(`     - Slot Exhaustion: active=${slotReport.activeSlots}/${slotReport.maxSlots}, usage=${slotReport.exhaustionPercent.toFixed(1)}%, risk=${slotReport.riskLevel}`);
  if (slotReport.riskLevel !== 'HIGH' || slotReport.exhaustionPercent !== 80) {
      throw new Error('Replication slot exhaustion risk bounds computed incorrectly!');
  }

  // Prepared Transaction Leak Check
  const preparedTxs = [
      { xid: 'tx_101', ageSeconds: 15 },
      { xid: 'tx_102', ageSeconds: 4500 } // old transaction
  ];
  const prepReport = pgArch.checkPreparedTransactions(preparedTxs);
  console.log(`     - Prepared Tx Leak: leakedCount=${prepReport.leakedCount}, requiresManualRollback=${prepReport.requiresManualRollback}`);
  if (prepReport.leakedCount !== 2 || !prepReport.requiresManualRollback || prepReport.abandonedXids[0] !== 'tx_102') {
      throw new Error('Prepared transaction leak checks failed!');
  }

  // XID Wraparound Check
  const xidReportNormal = pgArch.evaluateXidWraparound(10000000);
  const xidReportCritical = pgArch.evaluateXidWraparound(1900000000);
  console.log(`     - XID Wraparound normal risk=${xidReportNormal.riskLevel}, critical risk=${xidReportCritical.riskLevel}, autovacuumEmergency=${xidReportCritical.autovacuumEmergencyActive}`);
  if (xidReportNormal.riskLevel !== 'LOW' || xidReportCritical.riskLevel !== 'CRITICAL' || !xidReportCritical.autovacuumEmergencyActive) {
      throw new Error('XID wraparound warning and autovacuum logic incorrect!');
  }

  // Torn Page Validation
  const normalPage = Buffer.alloc(8192);
  normalPage.writeUInt16LE(100, 12); // pd_lower = 100
  normalPage.writeUInt16LE(200, 14); // pd_upper = 200
  const normalPageCheck = pgArch.checkTornPage(normalPage);

  const tornPage = Buffer.alloc(8192);
  tornPage.writeUInt16LE(200, 12); // pd_lower = 200
  tornPage.writeUInt16LE(100, 14); // pd_upper = 100 (pd_lower > pd_upper means torn write)
  const tornPageCheck = pgArch.checkTornPage(tornPage);

  console.log(`     - Page Checks: normalCorrupted=${normalPageCheck.isCorrupted}, tornCorrupted=${tornPageCheck.isCorrupted}`);
  if (normalPageCheck.isCorrupted || !tornPageCheck.isCorrupted || !tornPageCheck.isTorn) {
      throw new Error('Torn page validation header boundary check failed!');
  }

  console.log('  ✅ PostgreSQL Physical Archaeology verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 3: Multi-Day Soak Coordinator
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 3] Testing Multi-Day Soak Coordinator & Heap Slopes...');
  const soak = new MultiDaySoakCoordinator();

  // Load a leaking sequence: Heap grows linearly by 1MB (1048576 bytes) every 10 seconds
  const startTime = Date.now();
  for (let i = 0; i < 6; i++) {
      soak.recordSample({
          timestamp: startTime + (i * 10000),
          heapUsedBytes: 100 * 1024 * 1024 + (i * 1048576), // Leaking heap
          replayEntropy: 0.1 * i,
          telemetryBytesIngested: 5000000,
          businessTransactionsProcessed: 1000,
          alertCount: 2,
          falsePositiveAlertCount: i,
          uncompressedBytes: 1000000,
          compressedBytes: 150000 // 85% compaction efficiency
      });
  }

  const summary = soak.getCampaignSummary();
  if (!summary) {
      throw new Error('Soak campaign summary was unexpectedly null!');
  }

  console.log(`     - Soak Summary (Leaking Campaign):`);
  console.log(`       ├─ Duration:             ${summary.durationHours} hours`);
  console.log(`       ├─ Heap Growth Slope:    ${summary.heapSlopeBytesPerSec.toFixed(2)} bytes/sec`);
  console.log(`       ├─ Memory Leak Detected: ${summary.isHeapLeaking}`);
  console.log(`       ├─ Avg Telemetry Amp:    ${summary.averageTelemetryAmplificationRatio} bytes/txn`);
  console.log(`       ├─ Compaction Efficiency: ${(summary.averageCompactionEfficiency * 100).toFixed(1)}%`);
  console.log(`       └─ Alert Fatigue Index:  ${summary.operatorFatigueIndex.toFixed(2)} alerts/hour`);

  // Expected growth slope: 1048576 bytes / 10 sec = 104857.6 bytes/sec
  if (Math.abs(summary.heapSlopeBytesPerSec - 104857.6) > 10) {
      throw new Error('Least-squares regression calculated incorrect heap slope value!');
  }
  if (!summary.isHeapLeaking) {
      throw new Error('Soak coordinator failed to detect active memory leak!');
  }
  if (summary.averageCompactionEfficiency !== 0.85) {
      throw new Error('Compaction efficiency average calculated incorrectly!');
  }

  console.log('  ✅ Multi-Day Soak Coordinator verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 4: Intelligent Replay Compressor
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 4] Testing Intelligent Replay Compressor...');
  const comp = new ReplayCompressor();

  // Causality Graph Pruning
  const graph: CausalGraph = {
      nodes: [
          { id: 'node1', type: 'COMMIT', importance: 1.0 },
          { id: 'node2', type: 'LOCK_RETRY', importance: 0.5 },
          { id: 'node3', type: 'HEARTBEAT', importance: 0.1 } // below threshold
      ],
      edges: [
          { from: 'node1', to: 'node2', relationship: 'BLOCKS' },
          { from: 'node2', to: 'node3', relationship: 'TRIGGERS' }
      ]
  };

  const compGraph = comp.compressCausalityGraph(graph, 0.3);
  console.log(`     - Graph Pruning: nodes=${compGraph.nodes.length}/${graph.nodes.length}, edges=${compGraph.edges.length}/${graph.edges.length}, prunedCount=${compGraph.prunedNodeCount}`);
  if (compGraph.nodes.length !== 2 || compGraph.edges.length !== 1 || compGraph.prunedNodeCount !== 1) {
      throw new Error('Causality graph compressor failed to prune low-importance nodes or edges!');
  }

  // Semantic Deduplication
  const stream: TelemetryEvent[] = [
      { id: 'e1', type: 'HEARTBEAT', timestamp: 1000, entropyScore: 0.05, payload: {} },
      { id: 'e2', type: 'HEARTBEAT', timestamp: 2000, entropyScore: 0.05, payload: {} },
      { id: 'e3', type: 'HEARTBEAT', timestamp: 3000, entropyScore: 0.85, payload: {} }, // high entropy spike!
      { id: 'e4', type: 'HEARTBEAT', timestamp: 4000, entropyScore: 0.05, payload: {} },
      { id: 'e5', type: 'HEARTBEAT', timestamp: 5000, entropyScore: 0.05, payload: {} },
      { id: 'e6', type: 'METRIC_TIGHT', timestamp: 6000, entropyScore: 0.10, payload: {} }
  ];

  const deduped = comp.semanticDeduplication(stream);
  console.log(`     - Semantic Deduplication: events=${deduped.length}/${stream.length}`);
  // Should keep:
  // - First & last of HEARTBEAT run (e1, e5)
  // - High-entropy spike in HEARTBEAT run (e3)
  // - The separate event type (e6)
  if (deduped.length !== 4) {
      console.error('Deduped events:', deduped);
      throw new Error('Semantic deduplication did not correctly compress telemetry event sequence!');
  }

  // Replay Delta Encoding
  const trace1: ReplayTrace = {
      traceId: 'trace_base',
      steps: [
          { index: 1, action: 'ACQUIRE_LEASE', stateHash: 'hash_a', timestamp: 1000 },
          { index: 2, action: 'WRITE_DB', stateHash: 'hash_b', timestamp: 2000 }
      ]
  };

  const trace2: ReplayTrace = {
      traceId: 'trace_next',
      steps: [
          { index: 1, action: 'ACQUIRE_LEASE', stateHash: 'hash_a', timestamp: 1000 },
          { index: 2, action: 'WRITE_DB', stateHash: 'hash_different', timestamp: 2050 } // divergence
      ]
  };

  const deltaEncoded = comp.replayDeltaEncoding([trace1, trace2]);
  console.log(`     - Delta Encoding: baseSteps=${deltaEncoded[0].addedSteps.length}, deltaSteps=${deltaEncoded[1].addedSteps.length}`);
  if (deltaEncoded[0].addedSteps.length !== 2 || deltaEncoded[1].addedSteps.length !== 1 || deltaEncoded[1].addedSteps[0].stateHash !== 'hash_different') {
      throw new Error('Replay trace delta encoding calculations incorrect!');
  }

  console.log('  ✅ Intelligent Replay Compressor verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 5: Operator Explainability Engine
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 5] Testing SRE Operator Explainability Engine...');
  const expl = new OperatorExplainabilityEngine();

  const normalTrace: ReplayTrace = {
      traceId: 't1',
      steps: [
          { index: 1, action: 'INITIALIZE', stateHash: 'hash1', timestamp: 1000 },
          { index: 2, action: 'PROCESS', stateHash: 'hash2', timestamp: 2000 }
      ]
  };

  const explanation = expl.explainTrace(normalTrace);
  console.log(`     - Trace Explanation: summary="${explanation.summary}", confidence=${explanation.confidenceScore}`);
  if (explanation.confidenceScore !== 1.0 || explanation.causalChain.length !== 2) {
      throw new Error('Causal trace explainer output incorrect!');
  }

  // Out of order/index gaps trace
  const anomalyTrace: ReplayTrace = {
      traceId: 't2',
      steps: [
          { index: 1, action: 'INITIALIZE', stateHash: 'hash1', timestamp: 2000 },
          { index: 3, action: 'PROCESS', stateHash: 'hash2', timestamp: 1000 } // index jump & timestamp inversion
      ]
  };

  const anomalyExplanation = expl.explainTrace(anomalyTrace);
  console.log(`     - Anomaly Trace: confidence=${anomalyExplanation.confidenceScore}, contradictionsCount=${anomalyExplanation.contradictions.length}`);
  if (anomalyExplanation.confidenceScore >= 1.0 || anomalyExplanation.contradictions.length === 0) {
      throw new Error('Causal trace explainer failed to detect timestamp inversion or index gaps!');
  }

  // Baseline audit
  const diffs = expl.auditContradictionsAgainstBaseline(normalTrace, normalTrace);
  const diffsCorrupt = expl.auditContradictionsAgainstBaseline(anomalyTrace, normalTrace);
  console.log(`     - Baseline comparison: diffCountNormal=${diffs.length}, diffCountCorrupt=${diffsCorrupt.length}`);
  if (diffs.length !== 0 || diffsCorrupt.length === 0) {
      throw new Error('Baseline contradiction audit failed!');
  }

  console.log('  ✅ SRE Operator Explainability Engine verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 6: Real-World Economics Database
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 6] Testing Real-World Economics Database & Fatigue...');
  const economics = new RealWorldEconomicsDatabase(75.00);

  // Storage pricing curves
  const testBytes = 100 * 1024 * 1024 * 1024; // 100 GB
  const storageCost = economics.calculateStorageModel(testBytes, 0.8);
  console.log(`     - 100GB Storage projection: total=$${storageCost.totalMonthlyStorageCostUsd} USD/mo, StandardGB=${storageCost.standardGb}, GlacierGB=${storageCost.glacierGb}`);
  // 80GB Glacier ($0.0792) + 20GB Standard ($0.46) = $0.5392 -> $0.54
  if (storageCost.totalMonthlyStorageCostUsd !== 0.54) {
      throw new Error('Storage pricing curves computation incorrect!');
  }

  // Serverless replay validation compute costs
  const computeCost = economics.calculateComputeReplayBudget(500000, 1.5, 1024); // 500k Lambdas, 1.5s runtime, 1GB RAM
  console.log(`     - Compute costs: total=$${computeCost.totalComputeCostUsd} USD, exec=$${computeCost.lambdaExecCostUsd} USD`);
  // 500,000 * 1.5s = 750,000 GB-seconds * 0.0000166667 = $12.50. Request cost = 0.5 * 0.20 = $0.10. Total = $12.60
  if (computeCost.totalComputeCostUsd !== 12.60) {
      throw new Error('Serverless Lambda replay compute budget calculation incorrect!');
  }

  // Retrieval Tier Costing
  const retrievalExpedited = economics.calculateRetrievalEconomics(testBytes, 'expedited');
  const retrievalBulk = economics.calculateRetrievalEconomics(testBytes, 'bulk');
  console.log(`     - Retrieval: Expedited Cost=$${retrievalExpedited.retrievalCostUsd} USD (delay=${retrievalExpedited.latencyMinutes}m), Bulk Cost=$${retrievalBulk.retrievalCostUsd} USD`);
  // Expedited: 100GB * $0.03 = $3.00 + 100GB * $0.09 (egress) = $12.00
  if (retrievalExpedited.retrievalCostUsd !== 12.00 || retrievalBulk.retrievalCostUsd !== 9.25) {
      throw new Error('Archival retrieval tier cost calculation incorrect!');
  }

  // SRE alert fatigue labor loss
  const fatigueReport = economics.calculateAlertFatigueLaborLoss(10); // 10 alerts/day
  console.log(`     - Fatigue (10 alerts): triageTime=${fatigueReport.alertsTriageTimeHours} hours, productivityLoss=$${fatigueReport.productivityLossUsd} USD, effectiveRate=$${fatigueReport.effectiveHourlyRate} USD/hr, MTTRmultiplier=${fatigueReport.mttrMultiplier}`);
  // Triage hours = 10 * 20 / 60 = 3.33 hours. Productivity loss = 3.33 * 75 = $250.
  // Fatigue penalty = 10 * 0.04 = 40% -> Effective rate = $45/hr. MTTR multiplier = 1.0 + 10 * 0.08 = 1.8.
  if (fatigueReport.alertsTriageTimeHours !== 3.33 || fatigueReport.productivityLossUsd !== 250.00 || fatigueReport.effectiveHourlyRate !== 45.00 || fatigueReport.mttrMultiplier !== 1.8) {
      throw new Error('SRE alert fatigue labor loss or MTTR multiplier logic incorrect!');
  }

  console.log('  ✅ Real-World Economics Database verified.\n');

  console.log('================================================================================');
  console.log('🎉  ALL ZTAN PHASE 20 VERIFICATION DRILLS COMPLETED SUCCESSFULLY!');
  console.log('================================================================================');
}

runPhase20Verification().catch(err => {
  console.error('\n❌  VERIFICATION FAILURE DETECTED:');
  console.error(err);
  process.exit(1);
});
