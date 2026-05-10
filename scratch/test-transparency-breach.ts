import { gossipRegistry, SignedCheckpoint } from '../packages/utils/src/transparency/gossip-registry';
import { EquivocationDetector } from '../packages/utils/src/transparency/equivocation-detector';
import crypto from 'crypto';

/**
 * 🛡️ ZTAN Transparency Breach Simulator
 * 
 * This script simulates a malicious witness attempting a split-view attack.
 * It manually creates two conflicting checkpoints for the same tree size
 * and verifies that our detection logic flags it.
 */
async function runAttackSimulation() {
    console.log('[BREACH-SIM] Starting Split-View Attack Simulation...');

    const witnessKeyId = 'malicious-witness-001';
    
    // 1. Legitimate Checkpoint (Tree Size 10)
    const legitCheckpoint: SignedCheckpoint = {
        treeSize: 10,
        rootHash: crypto.createHash('sha256').update('legit-state').digest('hex'),
        timestamp: new Date().toISOString(),
        witnessKeyId,
        signature: 'fake-signature-1',
        signatureAlgorithm: 'ed25519'
    };

    // 2. Malicious Checkpoint (Tree Size 10, Different Root)
    // This is a "Fork" - the witness is showing a different version of the same history state.
    const maliciousCheckpoint: SignedCheckpoint = {
        treeSize: 10,
        rootHash: crypto.createHash('sha256').update('malicious-state').digest('hex'),
        timestamp: new Date().toISOString(),
        witnessKeyId,
        signature: 'fake-signature-2',
        signatureAlgorithm: 'ed25519'
    };

    console.log('[BREACH-SIM] Publishing legitimate checkpoint...');
    await gossipRegistry.publish(legitCheckpoint);

    console.log('[BREACH-SIM] Publishing malicious conflicting checkpoint...');
    await gossipRegistry.publish(maliciousCheckpoint);

    // 3. Verification
    console.log('[BREACH-SIM] Running Equivocation Detector...');
    const checkpoints = await gossipRegistry.listCheckpoints(witnessKeyId);
    
    let breachDetected = false;
    for (let i = 0; i < checkpoints.length; i++) {
        for (let j = i + 1; j < checkpoints.length; j++) {
            const conflict = EquivocationDetector.detectConflict(checkpoints[i], checkpoints[j]);
            if (conflict) {
                console.log(`[PASS] SUCCESS: Equivocation Detector caught the ${conflict.type}!`);
                console.log(`[PASS] Detail: ${conflict.detail}`);
                breachDetected = true;
            }
        }
    }

    if (!breachDetected) {
        console.error('[FAIL] Equivocation Detector failed to catch the fork.');
        process.exit(1);
    }

    // 4. Test Monotonicity Violation
    console.log('[BREACH-SIM] Testing Monotonicity Violation (Rollback)...');
    const rollbackCheckpoint: SignedCheckpoint = {
        treeSize: 5, // Shrunk from 10
        rootHash: crypto.createHash('sha256').update('rollback-state').digest('hex'),
        timestamp: new Date(Date.now() + 10000).toISOString(), // Later timestamp
        witnessKeyId,
        signature: 'fake-signature-3',
        signatureAlgorithm: 'ed25519'
    };

    const monoConflict = EquivocationDetector.detectConflict(legitCheckpoint, rollbackCheckpoint);
    if (monoConflict && monoConflict.type === 'NON_MONOTONIC') {
        console.log(`[PASS] SUCCESS: Caught Non-Monotonic History (Rollback)!`);
    } else {
        console.error('[FAIL] Failed to catch monotonicity violation.');
        process.exit(1);
    }

    console.log('[BREACH-SIM] Simulation Complete. ZTAN transparency safeguards are operational.');
}

runAttackSimulation();
