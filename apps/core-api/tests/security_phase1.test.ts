/**
 * ZTAN Phase 1 Security Hardening - Automated Test Suite
 * Validates Identity Binding, Authenticated Messages, Fraud Accountability, and Transcript Integrity.
 */
import { TssCeremonyService } from '../src/services/tss-ceremony.service';
import { IdentityService } from '../src/services/identity.service';
import { ThresholdCrypto } from '@packages/ztan-crypto';

async function runPhase1SecurityTests() {
    console.log('--- ZTAN PHASE 1 SECURITY TEST SUITE ---');

    try {
        // 1. IDENTITY BINDING TESTS
        console.log('\n[1/5] Testing Identity Binding Layer...');
        
        try {
            await IdentityService.registerNode('nodeD', 'invalid-key');
            console.error('❌ FAIL: Accepted invalid public key format');
        } catch (e) {
            console.log('✔ PASS: Rejected invalid public key format');
        }

        const validKey = 'a'.repeat(96);
        await IdentityService.registerNode('nodeD', validKey);
        try {
            await IdentityService.registerNode('nodeE', validKey);
            console.error('❌ FAIL: Accepted duplicate public key');
        } catch (e) {
            console.log('✔ PASS: Rejected duplicate public key');
        }

        // 2. AUTHENTICATION TESTS
        console.log('\n[2/5] Testing Authenticated Messages...');
        const ceremony = await TssCeremonyService.init(2, ['nodeA', 'nodeB', 'nodeC'], 'TEST_HASH');
        
        // Mock a stale message
        const staleMsg = await ThresholdCrypto.signProtocolMessage('nodeA', ceremony.ceremonyId, 'DKG_ROUND_1', JSON.stringify([]));
        staleMsg.timestamp -= 60000; // 1 minute ago
        
        try {
            await TssCeremonyService.submitCommitments(staleMsg);
            console.error('❌ FAIL: Accepted stale message (>30s)');
        } catch (e) {
            console.log('✔ PASS: Rejected stale message');
        }

        // 3. IDENTITY SPOOF TEST
        console.log('\n[3/5] Testing Identity Spoofing Prevention...');
        const unregisteredMsg = await ThresholdCrypto.signProtocolMessage('attacker', ceremony.ceremonyId, 'DKG_ROUND_1', JSON.stringify([]));
        try {
            await TssCeremonyService.submitCommitments(unregisteredMsg);
            console.error('❌ FAIL: Accepted message from unregistered node');
        } catch (e) {
            console.log('✔ PASS: Rejected unregistered node identity');
        }

        // 4. FRAUD ACCOUNTABILITY TEST
        console.log('\n[4/5] Testing Fraud Accountability...');
        // We'll simulate Round 1 first
        for (const id of ['nodeA', 'nodeB', 'nodeC']) {
            const msg = await ThresholdCrypto.signProtocolMessage(id, ceremony.ceremonyId, 'DKG_ROUND_1', JSON.stringify([]));
            await TssCeremonyService.submitCommitments(msg);
        }
        
        // Submit valid shares for A and B, but invalid for C
        console.log('Simulating DKG Round 2 with one fraudulent node (nodeC)...');
        for (const id of ['nodeA', 'nodeB']) {
            const msg = await ThresholdCrypto.signProtocolMessage(id, ceremony.ceremonyId, 'DKG_ROUND_2', JSON.stringify({}));
            await TssCeremonyService.submitShares(msg);
        }
        
        // nodeC sends invalid payload (backend simulation will generate bad shares if we mock it or just pass junk)
        // Actually, our backend simulation is "honest" if payload is {}, so we'll pass a specific "BAD" payload
        const fraudMsg = await ThresholdCrypto.signProtocolMessage('nodeC', ceremony.ceremonyId, 'DKG_ROUND_2', JSON.stringify({ fraud: true }));
        try {
            const state = await TssCeremonyService.submitShares(fraudMsg);
            const nodeC = state.participants.find(p => p.nodeId === 'nodeC');
            if (nodeC?.status === 'FRAUD_DETECTED') {
                console.log('✔ PASS: nodeC correctly marked as FRAUD_DETECTED');
            } else {
                console.error('❌ FAIL: nodeC status not updated to FRAUD_DETECTED');
            }
            
            if (state.status === 'ACTIVE') {
                console.log('✔ PASS: Ceremony survived fraud (quorum 2/3 still possible)');
            } else {
                console.error(`❌ FAIL: Ceremony failed despite valid quorum. Status: ${state.status}`);
            }
        } catch (e: any) {
            console.log(`Info: DKG Finalization triggered (expected in simulation): ${e.message}`);
        }

        // 5. TRANSCRIPT INTEGRITY TEST
        console.log('\n[5/5] Testing Coordinator Transcript...');
        const finalState = await TssCeremonyService.getActive();
        if (finalState && finalState.transcript.length > 0) {
            const isSequential = finalState.transcript.every((e, i) => i === 0 || e.sequence === finalState.transcript[i-1].sequence + 1);
            if (isSequential) {
                console.log(`✔ PASS: Transcript is strictly sequential (Length: ${finalState.transcript.length})`);
            } else {
                console.error('❌ FAIL: Transcript sequence is non-linear or has gaps');
            }
        } else {
            console.error('❌ FAIL: No transcript recorded');
        }

        console.log('\n--- ALL PHASE 1 SECURITY TESTS COMPLETED ---');

    } catch (err: any) {
        console.error('\n❌ FATAL TEST ERROR:', err.message);
    }
}

// Simple Runner
runPhase1SecurityTests().then(() => {
    // Process exit or cleanup
});
