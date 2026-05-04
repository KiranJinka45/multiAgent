import { sidecarVerifier, consensusEngine, externalVerifier, notaryService } from '../../apps/governance/src';
import * as crypto from 'crypto';

async function runZtanV2V3Test() {
  console.log('==================================================');
  console.log('🛡️ ZTAN V2/V3 ZERO-TRUST INTEGRITY TEST');
  console.log('==================================================');

  const sequenceId = 1010; // Trigger notarization (divisible by 10)

  // --- SCENARIO 1: BYZANTINE PASS (2/3 CONSENSUS) ---
  // Node A (Engine) and Node B (Sidecar) agree, Node C (External) disagrees but majority rules.
  console.log('\n🔹 Scenario 1: Byzantine Pass (2/3 Consensus)');
  
  // Node A is spiking CPU (Sidecar logic match)
  const telemetry1 = [
    { nodeId: 'node-a', metrics: { cpu: 95, memory: 40, latency: 10, errors: 0 } }
  ];

  const decision1 = {
    eventId: sequenceId.toString(),
    type: 'RESTART',
    targetNode: 'node-a',
    reason: 'CPU Spike',
    timestamp: Date.now()
  };

  // Node A Attestation
  const attestationA = { eventId: sequenceId.toString(), status: 'PASS', verifierId: 'SRE-ENGINE-01', expectedNode: 'node-a', confidence: 1.0, timestamp: Date.now() };
  
  // Node B Attestation (Sidecar - CPU Logic)
  telemetry1.forEach(t => sidecarVerifier.processTelemetry(t as any));
  const attestationB = await sidecarVerifier.verifyDecision(decision1 as any);
  
  // Node C Attestation (External - Error/Latency Logic)
  // Since Errors=0 and Latency=10, Node C might not find a target or find a different one.
  const attestationC = await externalVerifier.verifyDecision(decision1 as any, telemetry1 as any);

  console.log(`- Node A: ${attestationA.status}`);
  console.log(`- Node B (Sidecar): ${attestationB.status}`);
  console.log(`- Node C (External): ${attestationC.status}`);

  await consensusEngine.recordAttestation(attestationA as any);
  await consensusEngine.recordAttestation(attestationB as any);
  const result1 = await consensusEngine.recordAttestation(attestationC as any);

  if (result1 && result1.isTrusted) {
    console.log('✅ PASS: Byzantine majority (2/3) achieved. Decision certified despite Node C disagreement.');
  } else {
    console.error('❌ FAIL: Byzantine consensus failed.');
    process.exit(1);
  }

  // --- SCENARIO 2: NOTARIZATION PROOF ---
  console.log('\n🔹 Scenario 2: External Notarization Proof');
  
  const localHash = crypto.createHash('sha256').update('dummy-data-' + sequenceId).digest('hex');
  const anchor = await notaryService.notarize(localHash);
  
  const isVerified = await notaryService.verify(localHash, anchor.sequenceId);
  if (isVerified) {
    console.log(`✅ PASS: Local hash verified against external notarized anchor [Seq: ${anchor.sequenceId}].`);
  } else {
    console.error('❌ FAIL: Notarization verification failed.');
    process.exit(1);
  }

  // --- SCENARIO 3: CONSENSUS FAILURE (1/3 PASS) ---
  console.log('\n🔹 Scenario 3: Consensus Failure (1/3 Pass)');
  const seqId2 = 1011;

  // Decision targets a healthy node
  const decision2 = {
    eventId: seqId2.toString(),
    type: 'RESTART',
    targetNode: 'node-healthy',
    reason: 'False alarm',
    timestamp: Date.now()
  };

  const attA2 = { eventId: seqId2.toString(), status: 'PASS', verifierId: 'SRE-ENGINE-01', expectedNode: 'node-healthy', confidence: 1.0, timestamp: Date.now() };
  const attB2 = await sidecarVerifier.verifyDecision(decision2 as any);
  const attC2 = await externalVerifier.verifyDecision(decision2 as any, telemetry1 as any);

  console.log(`- Node A: ${attA2.status}`);
  console.log(`- Node B: ${attB2.status}`);
  console.log(`- Node C: ${attC2.status}`);

  await consensusEngine.recordAttestation(attA2 as any);
  await consensusEngine.recordAttestation(attB2 as any);
  const result2 = await consensusEngine.recordAttestation(attC2 as any);

  if (result2 && !result2.isTrusted && result2.governanceMode === 'SAFE_MODE') {
    console.log('✅ PASS: Total consensus failure (1/3). System forced to SAFE_MODE.');
  } else {
    console.error('❌ FAIL: Consensus failure not detected.');
    process.exit(1);
  }

  console.log('\n==================================================');
  console.log('🏁 ZTAN V2/V3 TEST COMPLETE: TRUE ZERO-TRUST ACHIEVED');
  console.log('==================================================');
}

runZtanV2V3Test().catch(console.error);
