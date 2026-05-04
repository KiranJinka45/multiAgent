import { sidecarVerifier, consensusEngine } from '../../apps/governance/src';
import * as crypto from 'crypto';

async function runZtanTest() {
  console.log('--------------------------------------------------');
  console.log('🧪 ZTAN CONSENSUS GATE TEST');
  console.log('--------------------------------------------------');

  const sequenceId = 1001;

  // SCENARIO 1: CONSENSUS PASS (CPU SPIKE)
  console.log('🔹 Scenario 1: Matched Decision (CPU Spike)');
  
  // 1. Feed telemetry to sidecar (Node A is spiking)
  sidecarVerifier.processTelemetry({
    nodeId: 'node-a',
    metrics: { cpu: 95, memory: 40, latency: 50, errors: 0 }
  });

  const decisionMatch = {
    eventId: sequenceId.toString(),
    type: 'RESTART',
    targetNode: 'node-a',
    reason: 'High CPU detected',
    timestamp: Date.now()
  };

  const attestationA1 = {
    eventId: sequenceId.toString(),
    status: 'PASS',
    verifierId: 'SRE-ENGINE-01',
    expectedNode: 'node-a',
    confidence: 1.0,
    timestamp: Date.now()
  };

  const sidecarAttestation1 = await sidecarVerifier.verifyDecision(decisionMatch as any);
  
  await consensusEngine.recordAttestation(attestationA1 as any);
  const result1 = await consensusEngine.recordAttestation(sidecarAttestation1);

  if (result1 && result1.isTrusted) {
    console.log('✅ PASS: Consensus achieved. Decision certified.');
  } else {
    console.error('❌ FAIL: Consensus failed unexpectedly.');
    process.exit(1);
  }

  // SCENARIO 2: CONSENSUS FAILURE (DIVERGENCE)
  console.log('\n🔹 Scenario 2: Divergent Decision (Healthy Node Target)');
  
  const seqId2 = 1002;

  // Node B is healthy
  sidecarVerifier.processTelemetry({
    nodeId: 'node-b',
    metrics: { cpu: 10, memory: 20, latency: 10, errors: 0 }
  });

  const decisionDiverge = {
    eventId: seqId2.toString(),
    type: 'RESTART',
    targetNode: 'node-b', // Engine targets a healthy node
    reason: 'Suspected anomaly',
    timestamp: Date.now()
  };

  const attestationA2 = {
    eventId: seqId2.toString(),
    status: 'PASS',
    verifierId: 'SRE-ENGINE-01',
    expectedNode: 'node-b',
    confidence: 1.0,
    timestamp: Date.now()
  };

  const sidecarAttestation2 = await sidecarVerifier.verifyDecision(decisionDiverge as any);
  
  await consensusEngine.recordAttestation(attestationA2 as any);
  const result2 = await consensusEngine.recordAttestation(sidecarAttestation2);

  if (result2 && !result2.isTrusted && result2.governanceMode === 'SAFE_MODE') {
    console.log('✅ PASS: Divergence detected. System forced to SAFE_MODE.');
  } else {
    console.error('❌ FAIL: Divergence was not blocked by consensus gate.');
    process.exit(1);
  }

  console.log('--------------------------------------------------');
  console.log('🏁 ZTAN TEST COMPLETE: CONSENSUS GATE VERIFIED');
  console.log('--------------------------------------------------');
}

runZtanTest().catch(console.error);
