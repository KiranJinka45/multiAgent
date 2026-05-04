import { sreEngine } from '../../apps/core-api/src/services/sre-engine';
import { ApprovalService } from '../../apps/core-api/src/services/approval-service';
import { StabilityEngine } from '../../apps/core-api/src/services/stability-engine';
import { CalibrationEngine } from '../../apps/core-api/src/services/calibration-engine';
import { logger } from '@packages/observability';

async function runTrustCertification() {
  console.log('🚀 INITIATING ADAPTIVE TRUST & HITL CERTIFICATION');
  console.log('--------------------------------------------------');

  // Ensure shadow mode is OFF for HITL testing
  process.env.SHADOW_MODE = 'false';

  const resetState = async () => {
    sreEngine.reset();
    await StabilityEngine.reset();
    // Register observer
    sreEngine.registerObserverSignal({
      id: 'test-observer',
      provider: 'TestProvider',
      state: 'NOMINAL',
      confidence: 1.0
    });
  };

  /**
   * TEST 1: Trust Degradation under High Disorder
   */
  console.log('\n▶ TEST 1: Trust Degradation (High Network Disorder)');
  await resetState();
  
  // Inject network disorder (simulated)
  // In a real run, this would be updated via telemetry ingestion.
  // We'll manually set it for the test.
  (sreEngine as any).networkDisorderScore = 0.6; 
  sreEngine.reportNodeAnomaly('api-service', 0.9);

  let state = await sreEngine.getCurrentState();
  console.log(`  Trust Score: ${state.trust?.score.toFixed(4)}`);
  console.log(`  Data Quality Factor: ${state.trust?.breakdown.dataQuality.toFixed(2)}`);
  
  if (state.trust!.score < 0.5) {
      console.log('  Result: ✅ Trust correctly degraded');
  } else {
      console.log('  Result: ❌ Trust remained too high');
  }

  /**
   * TEST 2: Stability Impact (RCA Oscillation)
   */
  console.log('\n▶ TEST 2: Stability Impact (RCA Oscillation)');
  await resetState();
  (sreEngine as any).networkDisorderScore = 1.0; // Reset disorder

  // Record oscillating RCA
  for (let i = 0; i < 10; i++) {
    await StabilityEngine.recordRootCause(i % 2 === 0 ? 'node-a' : 'node-b');
  }

  sreEngine.reportNodeAnomaly('node-a', 0.9);
  state = await sreEngine.getCurrentState();
  
  console.log(`  Stability Factor: ${state.trust?.breakdown.stability.toFixed(2)}`);
  if (state.trust!.breakdown.stability < 0.3) {
      console.log('  Result: ✅ Oscillation detected');
  } else {
      console.log('  Result: ❌ Stability factor too high');
  }

  /**
   * TEST 3: HITL Gating (Low Trust Approval Request)
   */
  console.log('\n▶ TEST 3: HITL Gating (Low Trust → Approval Required)');
  await resetState();
  
  // Force low trust via low confidence and low stability
  (sreEngine as any).networkDisorderScore = 0.5;
  for (let i = 0; i < 10; i++) await StabilityEngine.recordRootCause(i % 2 === 0 ? 'a' : 'b');
  
  sreEngine.reportNodeAnomaly('api-service', 0.9);
  state = await sreEngine.getCurrentState();

  console.log(`  Governance Mode: ${state.governance.mode}`);
  console.log(`  Approval Required: ${state.governance.approvalRequired ? 'YES' : 'NO'}`);
  console.log(`  Request ID: ${state.governance.approvalRequestId || 'NONE'}`);

  if (state.governance.mode === 'AWAITING_APPROVAL' && state.governance.approvalRequestId) {
      console.log('  Result: ✅ HITL Gate active');
      
      const reqId = state.governance.approvalRequestId;
      
      // Approve it!
      console.log('  Simulating Human Approval...');
      await ApprovalService.approve(reqId, 'admin-user', 'Confirmed DB failure');
      
      // Next cycle should proceed
      state = await sreEngine.getCurrentState();
      console.log(`  New Governance Mode: ${state.governance.mode}`);
      if (state.governance.mode !== 'AWAITING_APPROVAL') {
          console.log('  Result: ✅ Approval processed, execution unblocked');
      } else {
          console.log('  Result: ❌ Still stuck in AWAITING_APPROVAL');
      }
  } else {
      console.log('  Result: ❌ HITL Gate failed to trigger');
  }

  console.log('\n--------------------------------------------------');
  console.log('🏁 TRUST & HITL CERTIFICATION COMPLETE');
}

runTrustCertification().catch(err => {
  console.error('Trust Certification Failed:', err);
  process.exit(1);
});
