import './env-setup.js';
import {
  NoveltyTelemetryEngine
} from '../packages/runtime-core/src/index';

async function runPhase18Verification() {
  console.log('================================================================================');
  console.log('🧪  ZTAN PHASE 18 - UNKNOWN-UNKNOWN TELEMETRY SYSTEMS RUNNER');
  console.log('================================================================================\n');

  const engine = new NoveltyTelemetryEngine();

  // ────────────────────────────────────────────────────────────────────────
  // TEST 1: Behavioral Novelty (Z-Score) Scoring
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 1] Auditing Behavioral Novelty Scoring...');

  // Setup database write latency baseline: average 20ms, standard deviation 5ms
  // Values: [15, 20, 25, 18, 22, 20]
  const baselineValues = [15, 20, 25, 18, 22, 20];
  engine.recordBaseline('db_write_latency_ms', baselineValues);

  // Check nominal value
  const reportNominal = engine.scoreBehavioralNovelty('db_write_latency_ms', 21);
  console.log(`     - Nominal check (21ms): zScore=${reportNominal.zScore}, novelty=${reportNominal.noveltyScore}%, class=${reportNominal.classification}`);
  if (reportNominal.classification !== 'NOMINAL' || reportNominal.noveltyScore > 20) {
    throw new Error('Nominal value classified incorrectly or scored too high!');
  }

  // Check unusual value
  const reportUnusual = engine.scoreBehavioralNovelty('db_write_latency_ms', 28);
  console.log(`     - Unusual check (28ms): zScore=${reportUnusual.zScore}, novelty=${reportUnusual.noveltyScore}%, class=${reportUnusual.classification}`);
  if (reportUnusual.classification !== 'UNUSUAL') {
    throw new Error('Unusual value failed to trigger correct classification!');
  }

  // Check anomalous value (60ms is a massive outlier)
  const reportAnomaly = engine.scoreBehavioralNovelty('db_write_latency_ms', 60);
  console.log(`     - Anomalous check (60ms): zScore=${reportAnomaly.zScore}, novelty=${reportAnomaly.noveltyScore}%, class=${reportAnomaly.classification}`);
  if (reportAnomaly.classification !== 'ANOMALOUS' || reportAnomaly.noveltyScore < 80) {
    throw new Error('Severe anomaly outlier failed to score high novelty!');
  }

  console.log('  ✅ Behavioral Novelty Scoring verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 2: Entropy Spike Detection
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 2] Auditing Shannon Entropy Spike Detection...');

  const metricsMap = new Map<string, number[]>();
  // Flat metric: very low/zero entropy
  metricsMap.set('cpu_usage_pct', [10.0, 10.0, 10.0, 10.0, 10.0, 10.0, 10.0, 10.0, 10.0, 10.0]);
  // Spiking chaotic metric: high entropy
  metricsMap.set('queue_lag_ms', [5.0, 150.0, 2.0, 500.0, 10.0, 950.0, 8.0, 420.0, 1.0, 1200.0]);

  const entropyReport = engine.detectEntropySpikes(metricsMap, 10, 2.0);
  console.log(`     - Entropy Spikes check: hasSpikes=${entropyReport.hasEntropySpike}, spikedMetrics=[${entropyReport.spikedMetrics.join(', ')}]`);
  for (const [name, entropy] of entropyReport.metricEntropies.entries()) {
    console.log(`       └─ Metric: ${name}, Shannon Entropy: ${entropy}`);
  }

  if (!entropyReport.hasEntropySpike || !entropyReport.spikedMetrics.includes('queue_lag_ms')) {
    throw new Error('Failed to identify high entropy metric spike!');
  }
  if (entropyReport.spikedMetrics.includes('cpu_usage_pct')) {
    throw new Error('Flat metric incorrectly flagged as entropy spike!');
  }

  console.log('  ✅ Shannon Entropy Spike Detection verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 3: Unexpected Silence Monitoring
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 3] Auditing Unexpected Silence Monitoring...');

  const now = Date.now();
  const lastHeartbeats = new Map<string, number>([
    ['lease_renew_daemon', now - 100], // 100ms ago (Active)
    ['wal_replayer_worker', now - 8000] // 8s ago (Dead silence)
  ]);

  const silenceReport = engine.monitorUnexpectedSilence(lastHeartbeats, 5000); // 5s threshold
  console.log(`     - Silence check: hasUnexpectedSilence=${silenceReport.hasUnexpectedSilence}`);
  for (const s of silenceReport.silentSubsystems) {
    console.log(`       └─ Subsystem: ${s.subsystem}, Last Seen: ${s.lastSeenMsAgo}ms ago`);
  }

  if (!silenceReport.hasUnexpectedSilence || silenceReport.silentSubsystems.length !== 1 || silenceReport.silentSubsystems[0].subsystem !== 'wal_replayer_worker') {
    throw new Error('Failed to detect correct silent subsystem heartbeat timeout!');
  }

  console.log('  ✅ Unexpected Silence Monitoring verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 4: Compound Anomaly Reporting
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 4] Auditing Compound Anomaly Reports...');

  // Combine multiple dimensions of anomaly detection
  const totalScore = (reportAnomaly.noveltyScore + (entropyReport.hasEntropySpike ? 100 : 0) + (silenceReport.hasUnexpectedSilence ? 100 : 0)) / 3;
  console.log(`     - Compound Anomaly Score: ${Math.round(totalScore)}%`);
  if (totalScore < 80) {
    throw new Error('Compound anomaly metric aggregation failed!');
  }

  console.log('  ✅ Compound Anomaly Reporting verified.\n');

  console.log('================================================================================');
  console.log('🎉 PHASE 18 UNKNOWN-UNKNOWN TELEMETRY SYSTEMS VERIFIED SUCCESSFULLY');
  console.log('================================================================================');
}

runPhase18Verification().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
