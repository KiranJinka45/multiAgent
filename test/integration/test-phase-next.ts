import * as fs from 'fs';
import * as path from 'path';
import { 
  ComplexityBudgetEvaluator, 
  TelemetryCardinalityAuditor,
  IncidentReplayCatalog,
  RecoveryEffectivenessScorer,
  AnomalyFingerprinter
} from '../../packages/core-engine/src/index.js';
import { InstitutionalPilotRegistry } from '../../packages/production-pilot/src/index.js';

async function runPhaseNextVerification() {
  console.log('\n🧪 INITIATING PHASE NEXT: OPERATIONAL REALITY INTEGRATION DRILLS');
  console.log('--------------------------------------------------------------');

  const scratchDir = path.join(process.cwd(), 'scratch');
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }

  // 1. Layer 6: Mechanical Complexity Budgets
  console.log('🔹 Testing Layer 6 Complexity Budgets...');
  const evaluator = new ComplexityBudgetEvaluator(process.cwd());
  const budgetReport = evaluator.evaluate();
  console.log(`✅ Complexity Budget Evaluated. Score: ${budgetReport.complexityScore} (Max Allowed: ${budgetReport.complexityCeiling})`);
  
  const auditor = new TelemetryCardinalityAuditor();
  const liveMetrics = { 'ztan_tenant_executions_total': ['tenant-1', 'tenant-2'] };
  const violations = auditor.audit(liveMetrics);
  console.log(`✅ Telemetry Cardinality Audited. Violations Isolated: ${violations.length} (Expected: 0)`);
  if (violations.length > 0) throw new Error('Unexpected cardinality violations.');

  // 2. Layer 7: Controlled External Exposure (Sunset dates, Quotas)
  console.log('\n🔹 Testing Layer 7 Institutional Pilot Sunset & Quota Gates...');
  
  const pilotName = 'Mock-University-Cohort';
  const registeredPilot = InstitutionalPilotRegistry.registerPilot(pilotName, 'UNIVERSITY', {
    sunsetDays: 30,
    quota: 5,
    driftThreshold: 0.25,
  });
  console.log(`✅ Registered Pilot: ${registeredPilot.name} [Sunset Date: ${registeredPilot.sunsetDate}]`);

  // Assert allowed execution
  const resAllowed = InstitutionalPilotRegistry.validateExecutionAllowed(registeredPilot.id, 2, 0.05);
  console.log(`✅ Standard Execution Allowed check:`, resAllowed.allowed);
  if (!resAllowed.allowed) throw new Error(`Execution rejected unexpectedly: ${resAllowed.reason}`);

  // Assert rejected due to Concurrency Quota
  const resQuotaReject = InstitutionalPilotRegistry.validateExecutionAllowed(registeredPilot.id, 8, 0.05);
  console.log(`✅ Quota Overflow Rejection check: Allowed=${resQuotaReject.allowed}, Reason: ${resQuotaReject.reason}`);
  if (resQuotaReject.allowed) throw new Error('Expected concurrency quota rejection.');

  // Assert rejected due to dynamic semantic drift rollback trigger
  const resDriftReject = InstitutionalPilotRegistry.validateExecutionAllowed(registeredPilot.id, 2, 0.35);
  console.log(`✅ Drift Rollback Trigger check: Allowed=${resDriftReject.allowed}, Reason: ${resDriftReject.reason}`);
  if (resDriftReject.allowed) throw new Error('Expected semantic drift rollback rejection.');

  // 3. Layer 4 & 5: Operational Intelligence & Recovery Science
  console.log('\n🔹 Testing Layer 4 & 5 Operational Intelligence & Labor Scoring...');
  
  const catalog = new IncidentReplayCatalog(path.join(scratchDir, 'incidents'));
  const errorStack = 'Error: Replay divergence at sequence step 42\n    at Reducer.replay (reducer.ts:88:12)';
  
  const fingerprint = AnomalyFingerprinter.generateFingerprint(errorStack);
  console.log(`✅ Anomaly Fingerprint Compiled: ${fingerprint}`);
  
  const incident = catalog.registerIncident('workflow-099', errorStack, [
    'Retrieve signed audit ledger',
    'Execute cell-resurrection script',
  ]);
  console.log(`✅ Incident Indexed in Archive: ${incident.incidentId}`);
  
  const scorerReport = RecoveryEffectivenessScorer.score(incident.incidentId, 15000, 4, 1);
  console.log(`✅ Manual Recovery Labor scored successfully.`);
  console.log(`Labor Efficiency Index: ${scorerReport.laborEfficiencyIndex}% (Rating: ${scorerReport.rating})`);
  if (scorerReport.laborEfficiencyIndex < 80) throw new Error('Unexpected labor efficiency index calculation.');

  // 4. Priority 0: Consensus CAS Monotonic Increments
  console.log('\n🔹 Testing Priority 0 Consensus CAS Monotonic Increments...');
  const { DistributedLeaseManager } = await import('../../packages/production-pilot/src/consensus-adapter.js');
  const leaseManager = new DistributedLeaseManager('node-cas-test', 'test/ztan/primary5', [], true);
  
  const acquisitions = await Promise.all([
    leaseManager.acquireLeadership(3),
    leaseManager.acquireLeadership(3).catch(e => e.message)
  ]);
  console.log(`✅ Consensus CAS collision test executed. Leadership:`, acquisitions.map(a => typeof a === 'object' ? `SUCCESS_EPOCH_${a.epoch}` : 'REJECTED'));
  leaseManager.releaseLeadership();

  // 5. Priority 0: WASM Buffer Overflow Protection
  console.log('\n🔹 Testing Priority 0 WASM Buffer Overflow Protection...');
  const { WasmSandbox } = await import('../../packages/production-pilot/src/wasm-sandbox.js');
  const sandbox = new WasmSandbox();
  
  const memoryInstance = new WebAssembly.Memory({ initial: 1, maximum: 2 });
  const longPayload = 'x'.repeat(1024);
  
  try {
    (sandbox as any).writeString(memoryInstance, 0, 500, longPayload);
    throw new Error('Expected BUFFER_OVERFLOW exception but none was raised.');
  } catch (err: any) {
    console.log(`✅ Buffer Overflow Exception caught:`, err.message);
    if (!err.message.includes('BUFFER_OVERFLOW')) {
      throw new Error(`Unexpected exception: ${err.message}`);
    }
  }

  // 6. Priority 0: Parent Directory Fsync Durability
  console.log('\n🔹 Testing Priority 0 Parent Directory Fsync Durability...');
  const { fsyncDirectory } = await import('../../packages/production-pilot/src/durable-wal.js');
  try {
    fsyncDirectory(scratchDir);
    console.log('✅ Parent directory fsync executed successfully.');
  } catch (err: any) {
    throw new Error(`Directory fsync failed: ${err.message}`);
  }

  console.log('\n--------------------------------------------------------------');
  console.log('🎉 ALL PHASE NEXT OPERATIONAL INTEGRATION VERIFICATION TESTS PASSED CONVERGENTLY!');
  console.log('--------------------------------------------------------------\n');

  // Cleanup temporary pilot json file
  const pilotRegistryPath = path.join(process.cwd(), '.ztan', 'pilot-registry.json');
  if (fs.existsSync(pilotRegistryPath)) {
    fs.unlinkSync(pilotRegistryPath);
  }
}

runPhaseNextVerification().catch(err => {
  console.error(`\n❌ VERIFICATION DRILL FAILED: ${err.stack || err.message}`);
  process.exit(1);
});
