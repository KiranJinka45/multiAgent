import { describe, it, expect, beforeAll } from 'vitest';
import * as crypto from 'crypto';
import { ThresholdCrypto } from '../src/crypto-utils';
import { ConsensusEngine } from '../src/consensus-engine';
import { CeremonyEvent } from '../src/types';

describe('ZTAN Persistence & Recovery Simulation', () => {
    let nodeShares: any[];
    
    const T = 3;
    const N = 5;
    const NODE_IDS = ['node-1', 'node-2', 'node-3', 'node-4', 'node-5'];

    beforeAll(async () => {
        nodeShares = await ThresholdCrypto.performDKG(NODE_IDS, T);
    });

    it('Recovery: Reconstruct State from External Persistent Ledger', async () => {
        const eventId = 'recovery-test-001';
        const msg = '0'.repeat(64);
        
        // 1. Start a ceremony and record 2 attestations
        const engine1 = new ConsensusEngine(T, N, NODE_IDS);
        let events: CeremonyEvent[] = [];

        for (let i = 0; i < 2; i++) {
            const share = nodeShares[i];
            const sig = await ThresholdCrypto.signPartial(msg, share.share, share.nodeId, T, NODE_IDS);
            const _res = await engine1.recordAttestation({
                eventId,
                verifierId: share.nodeId,
                status: 'PASS',
                partialSignature: sig,
                expectedNode: 'target',
                confidence: 1.0,
                timestamp: Date.now()
            });
            // Capture events that would be in a persistent DB
            // In our simple engine, we can get them from the result if it finalized, 
            // but since it hasn't, we access the private ledger for the test.
            events = (engine1 as any).ledger.get(eventId);
        }

        expect(events.length).toBeGreaterThan(0);
        expect(ConsensusEngine.replay(events)).toBe('ACTIVE');

        // 2. CRASH: Engine1 is gone. New instance Engine2 starts.
        const engine2 = new ConsensusEngine(T, N, NODE_IDS);

        // 3. RECOVER: Manually prime Engine2 with captured events
        // In a real system, engine2 would load this from Postgres/Redis
        (engine2 as any).ledger.set(eventId, [...events]);
        (engine2 as any).stateMap.set(eventId, {
            status: 'ACTIVE',
            attestations: events.filter(e => e.type === 'ATTESTATION_ADDED').map(e => e.payload),
            lastUpdated: Date.now(),
            sequence: events.length
        });

        // 4. RESUME: Add the 3rd attestation to reach threshold T=3
        const share3 = nodeShares[2];
        const sig3 = await ThresholdCrypto.signPartial(msg, share3.share, share3.nodeId, T, NODE_IDS);
        const finalResult = await engine2.recordAttestation({
            eventId,
            verifierId: share3.nodeId,
            status: 'PASS',
            partialSignature: sig3,
            expectedNode: 'target',
            confidence: 1.0,
            timestamp: Date.now()
        });

        // 5. VERIFY: Resumed engine reached consensus correctly
        expect(finalResult).not.toBeNull();
        expect(finalResult?.isTrusted).toBe(true);
        expect(finalResult?.status).toBe('COMPLETED');
        expect(finalResult?.aggregatedSignature).toBeDefined();
    }, 20000);
});
