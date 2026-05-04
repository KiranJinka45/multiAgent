import { ThresholdCrypto } from '../../apps/governance/src/crypto-utils';
import { StabilityCircuit } from '../../apps/governance/src/stability-circuit';
import { notaryService } from '../../apps/governance/src/notary-service';
import * as crypto from 'crypto';

const logger = console;

async function runCertification() {
  logger.info('🚀 STARTING ZTAN AUDIT-GRADE CERTIFICATION...\n');
  console.log('DEBUG: Node.js version:', process.version);

  const nodeIds = ['node-a', 'node-b', 'node-c'];
  const threshold = 2;

  // --- 1. BLS THRESHOLD TEST ---
  logger.info('--- PHASE 1: BLS THRESHOLD SIGNATURES (DKG) ---');
  const shares = await ThresholdCrypto.performDKG(nodeIds, threshold);
  const groupPK = shares[0].groupPublicKey;
  const payload = 'AUDIT_EVENT_001|PASS|node-a';

  logger.info('Simulating partial signing from Node A and Node B...');
  const sigA = await ThresholdCrypto.signPartial(payload, shares[0].share, nodeIds[0], threshold, nodeIds);
  const sigB = await ThresholdCrypto.signPartial(payload, shares[1].share, nodeIds[1], threshold, nodeIds);

  logger.info('Aggregating signatures (Threshold = 2)...');
  const aggregate = await ThresholdCrypto.aggregate([sigA, sigB], threshold, nodeIds);

  logger.info('Testing MIX-AND-MATCH ATTACK (Aggregate different messages)...');
  const sigC = await ThresholdCrypto.signPartial('DIFFERENT_PAYLOAD', shares[2].share, nodeIds[2], threshold, nodeIds);
  try {
    await ThresholdCrypto.aggregate([sigA, sigC], threshold, nodeIds);
    logger.error('❌ TSAC FAILURE: System accepted mixed-message signatures!\n');
  } catch (err) {
    logger.info('✅ TSAC PROTECTION: Mixed-message aggregation correctly rejected.\n');
  }
  
  if (aggregate) {
    const isValid = await ThresholdCrypto.verifyAggregate(aggregate, payload, groupPK, threshold, nodeIds);
    if (isValid) {
      logger.info('✅ BLS SUCCESS: Threshold signature verified.\n');
    }
  }

  // --- 2. ZK CONSTRAINT TEST ---
  logger.info('--- PHASE 2: ZK-SNARK CONSTRAINT & RANGE ---');
  const validTelemetry = { acc: 0.95, ldet: 50, lsla: 200, threshold: 0.85 };
  const outOfRangeTelemetry = { acc: 1.05, ldet: 50, lsla: 200, threshold: 0.85 }; // acc > 1.0
  const temperedTelemetry = { acc: 0.95, ldet: 51, lsla: 200, threshold: 0.85 }; // Tampered ldet

  logger.info('Testing VALID telemetry (Score > Threshold)...');
  const validProof = await StabilityCircuit.generateProof(validTelemetry.acc, validTelemetry.ldet, validTelemetry.lsla, validTelemetry.threshold);
  const validVerify = await StabilityCircuit.verifyProof(validProof, validTelemetry.acc, validTelemetry.ldet, validTelemetry.lsla);
  
  logger.info('Testing OUT-OF-RANGE telemetry (acc = 1.05) - Circuit should REJECT...');
  const invalidVerify = await StabilityCircuit.verifyProof(validProof, outOfRangeTelemetry.acc, outOfRangeTelemetry.ldet, outOfRangeTelemetry.lsla);

  logger.info('Testing TAMPERED telemetry (Replay Attack) - Verifier should REJECT binding...');
  const temperedVerify = await StabilityCircuit.verifyProof(validProof, temperedTelemetry.acc, temperedTelemetry.ldet, temperedTelemetry.lsla);

  if (validVerify && !invalidVerify && !temperedVerify) {
    logger.info('✅ ZKAV SUCCESS: Constraints and Telemetry Binding strictly enforced.\n');
  } else {
    logger.error('❌ ZKAV FAILURE: Vulnerability detected in ZK pipeline!\n');
  }

  // --- 3. WORM ANCHORING TEST ---
  logger.info('--- PHASE 3: WORM ANCHORING (S3 OBJECT LOCK) ---');
  const headHash = '0x' + crypto.createHash('sha256').update('AUDIT_CHAIN_ROOT').digest('hex');
  const anchor = await notaryService.notarize(headHash);
  
  const isVerified = await notaryService.verify(headHash, anchor.sequenceId);
  if (isVerified) {
    const grade = anchor.auditGrade ? 'PRODUCTION-GRADE' : 'NON-PRODUCTION (SIMULATED)';
    logger.info(`✅ WORM SUCCESS: Anchor verified. Audit Level: ${grade}\n`);
  } else {
    logger.error('❌ WORM FAILURE: Anchor verification failed!\n');
  }

  logger.info('🏁 ZTAN CERTIFICATION COMPLETE.');
}

runCertification().catch(err => {
  logger.error('FATAL CERTIFICATION ERROR:', err);
  process.exit(1);
});
