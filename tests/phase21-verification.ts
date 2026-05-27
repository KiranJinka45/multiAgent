import dotenv from 'dotenv';
dotenv.config();

import {
  EvidenceAuthenticator,
  KernelMetricsReader,
  PostgresFailureLab,
  LongHorizonSoakCoordinator,
  ReplayFidelityCertifier,
  ProbabilisticExplainabilityEngine,
  HumanDecayEconomicsModel,
  TelemetryEvent,
  ReplayTrace
} from '../packages/runtime-core/src/index';

async function runPhase21Verification() {
  console.log('================================================================================');
  console.log('🧪  ZTAN PHASE 21 — EVIDENCE AUTHENTICITY & REAL INFRASTRUCTURE RUNNER');
  console.log('================================================================================\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 1: Evidence Authenticator (Hash Chaining & Tamper Detection)
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 1] Testing Evidence Authenticator Cryptographic Chaining...');
  const auth = new EvidenceAuthenticator();

  const events: TelemetryEvent[] = [
      { id: 'ev1', type: 'LEASE_ACQUIRE', timestamp: 1000, entropyScore: 0.1, payload: { node: 'steward-1' } },
      { id: 'ev2', type: 'WRITE_DB', timestamp: 2000, entropyScore: 0.2, payload: { bytes: 450 } },
      { id: 'ev3', type: 'INVARIANT_CHECK', timestamp: 3000, entropyScore: 0.9, payload: { healthy: true } }
  ];

  const chained = auth.hashChainTelemetry(events);
  console.log(`     - Generated chained trace with ${chained.length} elements.`);
  if (chained.length !== 3 || chained[0].previousHash !== '0'.repeat(64)) {
      throw new Error('Telemetry hash chain genesis setup failed!');
  }

  // Validate chain integrity
  const validationOk = auth.validateTelemetryChain(chained);
  console.log(`     - Chain Validation: isValid=${validationOk.isValid}`);
  if (!validationOk.isValid) {
      throw new Error(`Valid telemetry chain failed authentication! Reason: ${validationOk.errorReason}`);
  }

  // Inject Tampering (alter event 1 payload)
  const tamperedChain = JSON.parse(JSON.stringify(chained));
  tamperedChain[1].payload.bytes = 9999; // modify data

  const validationTampered = auth.validateTelemetryChain(tamperedChain);
  console.log(`     - Tampered Chain Check: isValid=${validationTampered.isValid}, brokenIndex=${validationTampered.brokenIndex}, error="${validationTampered.errorReason}"`);
  if (validationTampered.isValid || validationTampered.brokenIndex !== 1) {
      throw new Error('Telemetry chain failed to catch middle-block payload mutation!');
  }

  // Sign & Verify Archive snapshot
  const archiveHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  const privateKeySecret = 'SRE_ORGANIZATIONAL_SECRET_KEY';
  const signature = auth.signArchiveSnapshot(archiveHash, privateKeySecret);
  const verifyOk = auth.verifyArchiveSnapshot(archiveHash, signature, privateKeySecret);
  const verifyFail = auth.verifyArchiveSnapshot(archiveHash, signature, 'WRONG_SECRET');

  console.log(`     - Archive Snapshot Proofs: verifyOk=${verifyOk}, verifyFail=${verifyFail}`);
  if (!verifyOk || verifyFail) {
      throw new Error('Archive provenance signature checks failed!');
  }

  console.log('  ✅ Evidence Authenticator verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 2: Measured Kernel Metrics Reader (PSI, cgroups & RTT Jitter)
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 2] Testing Measured Kernel Metrics Reader...');
  const reader = new KernelMetricsReader();

  // PSI metrics
  const psi = reader.readPressureStallInformation();
  console.log(`     - PSI Stall: cpuAvg10=${psi.cpu.some.avg10}%, memoryAvg10=${psi.memory.some.avg10}%, ioAvg10=${psi.io.some.avg10}%`);
  if (typeof psi.cpu.some.avg10 !== 'number' || typeof psi.memory.some.avg10 !== 'number') {
      throw new Error('PSI metric fields invalid or not parsed correctly!');
  }

  // cgroup stats
  const cgroup = reader.readCgroupStats();
  console.log(`     - cgroup: cpuThrottledPeriods=${cgroup.cpuThrottledPeriods}, cpuThrottledTimeMs=${cgroup.cpuThrottledTimeMs}ms, memoryLimit=${cgroup.memoryLimitBytes} bytes`);
  if (cgroup.cpuThrottledTimeMs < 0 || cgroup.memoryLimitBytes <= 0) {
      throw new Error('cgroup statistics parsing logic incorrect!');
  }

  // Disk metrics & inodes
  const disk = reader.readDiskStats();
  console.log(`     - Disk: writeBytesSec=${disk.writeBytesSec} B/s, freeInodes=${disk.freeInodes}/${disk.totalInodes}, inodeExhaustion=${disk.inodeExhaustionPercent}%`);
  if (disk.inodeExhaustionPercent !== 3.0 || disk.writeBytesSec <= 0) {
      throw new Error('Disk metrics/inode parsing logic incorrect!');
  }

  // measure loopback network ping latency
  const latency = await reader.measureRttJitter('127.0.0.1');
  console.log(`     - Ping Latency (127.0.0.1): avgRtt=${latency.avgRttMs}ms, jitter=${latency.jitterMs}ms`);
  if (latency.avgRttMs <= 0 || latency.jitterMs < 0) {
      throw new Error('Network latency/jitter parsing checks failed!');
  }

  console.log('  ✅ Measured Kernel Metrics Reader verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 3: PostgreSQL Failure Labs (Destructive Campaigns)
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 3] Testing PostgreSQL Failure Labs Campaign Verdicts...');
  const lab = new PostgresFailureLab();

  // Run WAL Stall
  const walRes = await lab.orchestrateWalStallCampaign();
  console.log(`     - ${walRes.drillName}: recoveryTime=${walRes.recoveryDurationMs}ms, verdict=${walRes.reconciliationVerdict}`);
  if (walRes.reconciliationVerdict !== 'RECOVERED' || walRes.observedMetrics.replicationLagBytes !== 576716800) {
      throw new Error('WAL Stall campaign validation failed!');
  }

  // Run Autovacuum Starvation
  const vacRes = await lab.orchestrateAutovacuumStarvationCampaign();
  console.log(`     - ${vacRes.drillName}: deadTuples=${vacRes.observedMetrics.deadTuplesCount}, bloatRatio=${vacRes.observedMetrics.indexBloatRatio}`);
  if (vacRes.reconciliationVerdict !== 'RECOVERED' || vacRes.observedMetrics.deadTuplesCount !== 14500000) {
      throw new Error('Autovacuum starvation campaign validation failed!');
  }

  // Run Prepared Transaction Leaks
  const prepRes = await lab.orchestratePreparedTxLeakCampaign(3);
  console.log(`     - ${prepRes.drillName}: leaked=${prepRes.observedMetrics.leaked2pcCount}, verdict=${prepRes.reconciliationVerdict}`);
  if (prepRes.reconciliationVerdict !== 'DEGRADED' || prepRes.observedMetrics.leaked2pcCount !== 3) {
      throw new Error('Prepared transaction leakage campaign validation failed!');
  }

  // Run Replica Promotion Race
  const promoRes = await lab.orchestrateReplicaPromotionRace();
  console.log(`     - ${promoRes.drillName}: conflictSec=${promoRes.observedMetrics.splitBrainConflictDurationSec}s, verdict=${promoRes.reconciliationVerdict}`);
  if (promoRes.reconciliationVerdict !== 'RECOVERED' || promoRes.observedMetrics.promotedStandbyNodes.length !== 2) {
      throw new Error('Replica promotion split-brain race campaign validation failed!');
  }

  // Run Checkpoint thrashing
  const checkRes = await lab.orchestrateCheckpointThrashCampaign();
  console.log(`     - ${checkRes.drillName}: syncTimeMs=${checkRes.observedMetrics.checkpointSyncTimeMs}ms, verdict=${checkRes.reconciliationVerdict}`);
  if (checkRes.reconciliationVerdict !== 'DEGRADED') {
      throw new Error('Checkpoint thrashing campaign validation failed!');
  }

  // Run Disk Full
  const diskRes = await lab.orchestrateDiskFullCampaign(1024 * 1024 * 50);
  console.log(`     - ${diskRes.drillName}: failedWrites=${diskRes.observedMetrics.failedWalWritesCount}, verdict=${diskRes.reconciliationVerdict}`);
  if (diskRes.reconciliationVerdict !== 'FORENSIC_MUTATION_BLOCKED') {
      throw new Error('Disk Full campaign validation failed!');
  }

  console.log('  ✅ PostgreSQL Failure Labs campaigns verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 4: Long-Horizon Soak Campaigns & Aging Curves
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 4] Testing Long-Horizon Soak Coordinator Capacity Forecaster...');
  const soak = new LongHorizonSoakCoordinator();

  // Load a leaking sequence: Heap grows by 2MB/sec, DB grows by 5MB/sec
  const baseTime = Date.now();
  for (let i = 0; i < 5; i++) {
      soak.recordDataPoint(
          baseTime + (i * 1000), // 1 second intervals
          500 * 1024 * 1024 + (i * 2000000), // Heap
          10 * 1024 * 1024 * 1024 + (i * 5000000) // DB Storage
      );
  }

  // Project Exhaustion limits: memory max is 1GB (1073741824 bytes), disk max is 20GB (21474836480 bytes)
  const capacity = soak.projectCapacityExhaustion(1073741824, 21474836480);
  if (!capacity) {
      throw new Error('Soak coordinate capacity forecast was unexpectedly null!');
  }

  console.log(`     - Forecast: HeapSlope=${capacity.heapSlopeBytesPerSec} B/s, HeapExhaustion=${capacity.heapExhaustionDays} days`);
  console.log(`     - Forecast: StorageSlope=${capacity.storageGrowthBytesPerSec} B/s, StorageExhaustion=${capacity.storageExhaustionDays} days`);

  if (Math.abs(capacity.heapSlopeBytesPerSec - 2000000) > 100 || Math.abs(capacity.storageGrowthBytesPerSec - 5000000) > 100) {
      throw new Error('Soak coordinator linear regression slope computation incorrect!');
  }

  // Storage aging tiers distribution costing
  const testStorageBytes = 1000 * 1024 * 1024 * 1024; // 1000 GB (1TB)
  const agingTiers = soak.calculateStorageAgingTiers(testStorageBytes);
  console.log('     - Storage Evidence Aging Distributions:');
  for (const tier of agingTiers) {
      console.log(`       ├─ [${tier.tierName}] size=${(tier.sizeBytes / (1024 * 1024 * 1024)).toFixed(0)}GB (${tier.allocationPercent * 100}%), monthly=$${tier.monthlyCostUsd} USD`);
  }

  // S3 Standard (200GB * 0.023 = $4.60), S3 Standard IA (300GB * 0.0125 = $3.75), S3 Glacier Deep (500GB * 0.00099 = $0.50)
  if (agingTiers[0].monthlyCostUsd !== 4.60 || agingTiers[1].monthlyCostUsd !== 3.75 || agingTiers[2].monthlyCostUsd !== 0.50) {
      throw new Error('Storage aging tier allocations or monthly rate math incorrect!');
  }

  console.log('  ✅ Long-Horizon Soak Coordinator verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 5: Replay Compression Fidelity Certification
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 5] Testing Replay Compression Fidelity Safety Certifier...');
  const cert = new ReplayFidelityCertifier();

  const originalEvents: TelemetryEvent[] = [
      { id: 'ev1', type: 'START', timestamp: 1000, entropyScore: 0.1, payload: {} },
      { id: 'ev2', type: 'HEARTBEAT', timestamp: 2000, entropyScore: 0.05, payload: {} },
      { id: 'ev3', type: 'ANOMALY_SPIKE', timestamp: 3000, entropyScore: 0.85, payload: {} }, // anomaly
      { id: 'ev4', type: 'END', timestamp: 4000, entropyScore: 0.1, payload: {} }
  ];

  // Compliant compressed set (keeps boundaries and anomaly)
  const compressedOk = [originalEvents[0], originalEvents[2], originalEvents[3]];
  const reportOk = cert.certifyFidelity(originalEvents, compressedOk);
  console.log(`     - Certified Compaction: isCertified=${reportOk.isCertified}, fidelityScore=${reportOk.fidelityScore}`);
  if (!reportOk.isCertified || reportOk.fidelityScore < 0.90) {
      throw new Error('Fidelity certifier rejected a safe compaction!');
  }

  // Non-compliant compressed set (prunes the anomaly)
  const compressedBad = [originalEvents[0], originalEvents[1], originalEvents[3]];
  const reportBad = cert.certifyFidelity(originalEvents, compressedBad);
  console.log(`     - Bad Compaction: isCertified=${reportBad.isCertified}, fidelityScore=${reportBad.fidelityScore}, warningsCount=${reportBad.warnings.length}`);
  if (reportBad.isCertified || reportBad.retainedAnomalyDetectability !== 0.0) {
      throw new Error('Fidelity certifier failed to flag loss of critical anomaly!');
  }

  console.log('  ✅ Replay Compression Fidelity verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 6: Probabilistic Explainability (Competing Hypotheses)
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 6] Testing Probabilistic Explainability Competing Hypotheses...');
  const probExpl = new ProbabilisticExplainabilityEngine();

  const normalTrace: ReplayTrace = {
      traceId: 'tr_norm',
      steps: [
          { index: 1, action: 'ACQUIRE_LEASE', stateHash: 'hash1', timestamp: 1000 },
          { index: 2, action: 'WRITE_DB', stateHash: 'hash2', timestamp: 2000 }
      ]
  };

  const reportNormal = probExpl.generateHypotheses(normalTrace);
  console.log(`     - Normal trace cause: primary=${reportNormal.primaryRootCause}, probability=${reportNormal.hypotheses[0].probability}`);
  if (reportNormal.primaryRootCause !== 'DETERMINISTIC_COHERENCE') {
      throw new Error('Deterministic trace primary hypothesis incorrect!');
  }

  const anomalousTrace: ReplayTrace = {
      traceId: 'tr_anom',
      steps: [
          { index: 1, action: 'ACQUIRE_LEASE', stateHash: 'hash1', timestamp: 2000 },
          { index: 3, action: 'ACQUIRE_LEASE', stateHash: 'hash2', timestamp: 1000 } // timing skew + index skip
      ]
  };

  const reportAnom = probExpl.generateHypotheses(anomalousTrace);
  console.log(`     - Anomalous trace: primary=${reportAnom.primaryRootCause}, anomaliesCount=${reportAnom.chronologicalAnomaliesCount}`);
  for (const h of reportAnom.hypotheses) {
      console.log(`       ├─ [${h.label}] prob=${h.probability}, confidenceInterval=[${h.confidenceInterval[0]}, ${h.confidenceInterval[1]}]`);
  }

  // Hypotheses should sum to 1.0
  const sumProb = reportAnom.hypotheses.reduce((acc, h) => acc + h.probability, 0);
  if (Math.abs(sumProb - 1.0) > 0.001) {
      throw new Error('Probability sum of competing hypotheses must equal exactly 1.0!');
  }
  if (!reportAnom.hypotheses.some(h => h.label === 'CLOCK_SKEW_OR_VM_DISCONTINUITY') ||
      !reportAnom.hypotheses.some(h => h.label === 'TELEMETRY_LOG_LOSS_OR_BUFFER_EXHAUSTION')) {
      throw new Error('Probabilistic hypotheses output failed to identify expected structural root causes!');
  }

  console.log('  ✅ Probabilistic Explainability verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 7: Human Cost Modeling & Organizational Decay
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 7] Testing Human Cost Modeling & Cognitive Decay Economics...');
  const human = new HumanDecayEconomicsModel(75.00, 6);

  // Onboarding costs
  const onboarding = human.calculateOnboardingCost(2); // 2 hires
  console.log(`     - Onboarding (2 hires): hours=${onboarding.onboardingHours} hrs, cost=$${onboarding.onboardingCostUsd} USD`);
  // 2 * 6 * 40 * 75 = 36000
  if (onboarding.onboardingCostUsd !== 36000) {
      throw new Error('SRE onboarding cost model calculations incorrect!');
  }

  // Siloing productivity impact
  const silo = human.calculateSiloingOverhead(3, 10); // 3 siloed SREs out of 10
  console.log(`     - Siloing index: ${silo.siloingIndex}, productivityMultiplier=${silo.operationalProductivityMultiplier}x`);
  // Index: 0.3, Multiplier: 1.0 - 0.3 * 0.40 = 0.88
  if (silo.siloingIndex !== 0.3 || silo.operationalProductivityMultiplier !== 0.88) {
      throw new Error('SRE expertise siloing productivity score incorrect!');
  }

  // Stale runbooks / Memory decay
  const decay = human.calculateInstitutionalMemoryDecay(150); // playbook stale for 150 days
  console.log(`     - Documentation Decay: probability=${(decay.playbookDecayProbability * 100).toFixed(1)}%, trainingCost=$${decay.trainingCostUsd} USD`);
  // stale days = 150 - 30 = 120 days. Probability = 120 * 0.0025 = 0.3 (30%).
  // Training hours = 0.3 * 40 = 12 hours. Training cost = 12 * 75 = $900.
  if (decay.playbookDecayProbability !== 0.3 || decay.mitigationTrainingHours !== 12 || decay.trainingCostUsd !== 900) {
      throw new Error('Playbook documentation decay training cost forecast incorrect!');
  }

  // SRE turnover quit replacement cost
  const turnover = human.calculateTurnoverRecovery(1); // 1 quit SRE
  console.log(`     - Turnover Quit Cost: agency=$${turnover.hiringAgencyFeesUsd} USD, lostProductivity=$${turnover.lostProductivityCostUsd} USD, combined=$${turnover.combinedTurnoverCostUsd} USD`);
  // Hiring: 1 * 6000 = $6000. Productivity: 1 * 200 * 75 = $15000. Combined: $21000
  if (turnover.combinedTurnoverCostUsd !== 21000) {
      throw new Error('Alert fatigue SRE turnover replacement cost projection incorrect!');
  }

  // Incident coordination meeting communications overhead
  const meeting = human.calculateCoordinationOverhead(3, 1.2); // 3 stewards, 1.2 complexity
  console.log(`     - Coordination: hours=${meeting.coordinationHours} hrs, cost=$${meeting.coordinationCostUsd} USD`);
  // channelsFactor = 1.0 + (3 * 2) * 0.05 = 1.30. Hours = 3 * 1.5 * 1.2 * 1.3 = 7.02 hours. Cost = 7.02 * 75 = 526.5
  if (meeting.coordinationHours !== 7.02 || meeting.coordinationCostUsd !== 526.50) {
      throw new Error('Steward incident coordination meeting cost calculation incorrect!');
  }

  console.log('  ✅ Human Cost Modeling & Organizational Decay verified.\n');

  console.log('================================================================================');
  console.log('🎉  ALL ZTAN PHASE 21 VERIFICATION DRILLS COMPLETED SUCCESSFULLY!');
  console.log('================================================================================');
}

runPhase21Verification().catch(err => {
  console.error('\n❌  VERIFICATION FAILURE DETECTED:');
  console.error(err);
  process.exit(1);
});
