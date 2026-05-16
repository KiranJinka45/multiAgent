import { describe, it, expect, beforeAll } from 'vitest';
import { ThresholdCrypto } from '../src/crypto-utils';
import { ConsensusEngine } from '../src/consensus-engine';
import { CeremonyEvent } from '../src/types';

describe('ZTAN Recovery Consistency & Atomicity Simulation', () => {
    let nodeShares: any[];
    
    const T = 3;
    const N = 5;
    const NODE_IDS = ['node-1', 'node-2', 'node-3', 'node-4', 'node-5'];

    beforeAll(async () => {
        nodeShares = await ThresholdCrypto.performDKG(NODE_IDS, T);
    });

    it('Atomicity: Recovering from Crash EXACTLY at Threshold Boundary', async () => {
        const eventId = 'crash-at-threshold-001';
        const msg = 'ATOMIC_MSG'.repeat(8);
        
        const engine1 = new ConsensusEngine(T, N, NODE_IDS);
        
        // 1. Send T-1 attestations (Ceremony is ACTIVE)
        for (let i = 0; i < 2; i++) {
            const s = nodeShares[i];
            const sig = await ThresholdCrypto.signPartial(msg, s.share, s.nodeId, T, NODE_IDS);
            await engine1.recordAttestation({
                eventId, verifierId: s.nodeId, status: 'PASS', partialSignature: sig,
                expectedNode: 'target', confidence: 1.0, timestamp: Date.now()
            });
        }

        // 2. Prepare the 3rd attestation (This WOULD finalize the ceremony)
        const s3 = nodeShares[2];
        const sig3 = await ThresholdCrypto.signPartial(msg, s3.share, s3.nodeId, T, NODE_IDS);
        const attestation3 = {
            eventId, verifierId: s3.nodeId, status: 'PASS', partialSignature: sig3,
            expectedNode: 'target', confidence: 1.0, timestamp: Date.now()
        };

        // 3. CRASH SIMULATION: We have the events but engine1 is destroyed before it returns
        const events = (engine1 as any).ledger.get(eventId);
        expect(ConsensusEngine.replay(events)).toBe('ACTIVE');

        // 4. RESTART & SYNC: New engine instance starts with the same ledger
        const engine2 = new ConsensusEngine(T, N, NODE_IDS);
        (engine2 as any).ledger.set(eventId, [...events]);
        (engine2 as any).stateMap.set(eventId, {
            status: 'ACTIVE',
            attestations: events.filter((e: any) => e.type === 'ATTESTATION_ADDED').map((e: any) => e.payload),
            lastUpdated: Date.now(),
            sequence: events.length,
            proposalHash: msg
        });

        // 5. RESUME: Apply the 3rd attestation on the NEW instance
        const finalRes = await engine2.recordAttestation(attestation3);
        
        expect(finalRes?.status).toBe('COMPLETED');
        expect(finalRes?.isTrusted).toBe(true);

        // 6. DUPLICATE DELIVERY: Simulate the network delivering the 3rd attestation AGAIN after recovery
        const dupRes = await engine2.recordAttestation(attestation3);
        expect(dupRes).toBeNull(); // Should be rejected by duplicate detection
        
        // 7. FINAL VERIFY: Status remains COMPLETED
        const recoveredStatus = ConsensusEngine.replay((engine2 as any).ledger.get(eventId));
        expect(recoveredStatus).toBe('COMPLETED');
    }, 20000);
});
