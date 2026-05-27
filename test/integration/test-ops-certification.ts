import * as fs from 'fs';
import * as path from 'path';
import { 
  ReplayCertificationHarness, 
  ReplaySession, 
  ReplayEventLog,
  ResourceEnvelopeProfiler,
  OperatorRecoveryCertification
} from '../../packages/core-engine/src/index.js';

async function runCertificationTests() {
  console.log('\n🧪 INITIATING PHASE Z: EMPIRICAL RELIABILITY INTEGRATION DRILLS');
  console.log('------------------------------------------------------------');

  const scratchDir = path.join(process.cwd(), 'scratch');
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }

  const corpusPath = path.join(scratchDir, 'test_replay_corpus.json');
  if (fs.existsSync(corpusPath)) {
    fs.unlinkSync(corpusPath);
  }

  // 1. Replay Certification Harness Verification
  console.log('🔹 Running Replay Certification Harness Tests...');
  const harness = new ReplayCertificationHarness(corpusPath);

  const mockEvents: ReplayEventLog[] = [
    { workflowId: 'flow-001', sequence: 1, type: 'STEP_STARTED', timestamp: Date.now(), payload: { step: 1 } },
    { workflowId: 'flow-001', sequence: 2, type: 'STEP_COMPLETED', timestamp: Date.now(), payload: { result: 'OK' } },
  ];

  const session1: ReplaySession = {
    workflowId: 'flow-001',
    events: mockEvents,
    executionTimeMs: 150,
  };

  // First run: Register as baseline
  const res1 = harness.certify(session1);
  console.log(`✅ Baseline Registered. Reproducibility: ${res1.reproducibilityRate} (Expected: 1.0)`);
  if (res1.reproducibilityRate !== 1.0) throw new Error('Baseline reproducibility mismatch.');

  // Second run: Perfect match
  const res2 = harness.certify(session1);
  console.log(`✅ Exact Match Certified. Drift Score: ${res2.driftScore} (Expected: 0.0)`);
  if (res2.driftScore !== 0.0) throw new Error('Perfect match drift mismatch.');

  // Third run: Drift injection
  const driftedEvents: ReplayEventLog[] = [
    { workflowId: 'flow-001', sequence: 1, type: 'STEP_STARTED', timestamp: Date.now(), payload: { step: 1 } },
    { workflowId: 'flow-001', sequence: 2, type: 'STEP_FAILED', timestamp: Date.now(), payload: { error: 'CRASH' } }, // Drifted type
  ];

  const sessionDrift: ReplaySession = {
    workflowId: 'flow-001',
    events: driftedEvents,
    executionTimeMs: 180,
  };

  const resDrift = harness.certify(sessionDrift);
  console.log(`✅ Drift Detected. Reproducibility: ${resDrift.reproducibilityRate} (Expected: < 1.0)`);
  console.log(`Hotspots Isolated: ${resDrift.divergenceHotspots.join(', ')}`);
  if (resDrift.reproducibilityRate >= 1.0) throw new Error('Drift was not caught.');

  // 2. Resource Economics Profiler Verification
  console.log('\n🔹 Running Resource Economics Profiler Tests...');
  const profiler = new ResourceEnvelopeProfiler();
  profiler.start();

  // Record mock steps with simulated state bytes, WAL bytes, and trace payload bytes
  profiler.recordStep(100, 400, 80); // Step 1: WAL ratio 4x, Telemetry ratio 0.8x
  profiler.recordStep(200, 800, 160); // Step 2: WAL ratio 4x, Telemetry ratio 0.8x
  profiler.updateHandles(3, 2, 5); // simulated active handles

  const resourceReport = profiler.generateReport('flow-001', scratchDir);
  console.log(`✅ Resource Economics report generated successfully.`);
  console.log(`WAL Amplification Ratio: ${resourceReport.walAmplificationRatio} (Expected: 4.0)`);
  console.log(`Telemetry Amplification Ratio: ${resourceReport.telemetryAmplificationRatio} (Expected: 0.8)`);
  console.log(`Active File Handles: ${resourceReport.snapshots[resourceReport.snapshots.length - 1].openFileHandles} (Expected: 5)`);
  
  if (resourceReport.walAmplificationRatio !== 4.0) throw new Error('WAL amplification ratio mismatch.');
  if (resourceReport.telemetryAmplificationRatio !== 0.8) throw new Error('Telemetry amplification ratio mismatch.');

  // 3. Human Recovery Science Verification
  console.log('\n🔹 Running Operator Recovery Certification Tests...');
  const recoveryCert = new OperatorRecoveryCertification(scratchDir);
  
  recoveryCert.triggerFailure('WAL_CORRUPTION');
  recoveryCert.recordAction('locate_latest_signed_evidence');
  recoveryCert.recordAction('view_wal_diagnostics', true); // Ambiguous action
  recoveryCert.recordAction('run_cell_resurrection');
  
  const recoveryReport = recoveryCert.completeRecovery(true);
  console.log(`✅ Operator Recovery report compiled successfully.`);
  console.log(`MTTR: ${recoveryReport.mttrMs} ms`);
  console.log(`Ambiguity Score: ${recoveryReport.ambiguityScore} (Ambiguous actions penalized)`);
  console.log(`Recovery Success: ${recoveryReport.success} (Expected: true)`);
  
  if (!recoveryReport.success) throw new Error('Operator recovery success mismatch.');
  if (recoveryReport.ambiguityScore < 10) throw new Error('Ambiguity scoring penalty mismatch.');

  console.log('\n============================================================');
  console.log('🎉 ALL PHASE Z EMPIRICAL RELIABILITY TESTS PASSED CONVERGENTLY!');
  console.log('============================================================\n');

  // Cleanup
  if (fs.existsSync(corpusPath)) {
    fs.unlinkSync(corpusPath);
  }
}

runCertificationTests().catch(err => {
  console.error(`\n❌ INTEGRATION DRILL FAILED: ${err.stack || err.message}`);
  process.exit(1);
});
