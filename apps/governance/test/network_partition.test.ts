import { describe, it, expect, beforeAll } from 'vitest';
import { ThresholdCrypto } from '../src/crypto-utils';
import { ConsensusEngine } from '../src/consensus-engine';

describe('ZTAN Network Partition Resilience', () => {
    let nodeShares: any[];
    
    const T = 3;
    const N = 5;
    const NODE_IDS = ['node-1', 'node-2', 'node-3', 'node-4', 'node-5'];

    beforeAll(async () => {
        nodeShares = await ThresholdCrypto.performDKG(NODE_IDS, T);
    });

    it('Safety: Split-Brain Prevention via Proposal Locking', async () => {
        const eventId = 'partition-test-abort';
        const msgA = 'A'.repeat(64);
        const msgB = 'B'.repeat(64);
        
        const engine = new ConsensusEngine(T, N, NODE_IDS);

        // 1. Subset 1 (Nodes 1, 2) signs Message A
        // This locks the ceremony ID to Proposal A
        for (let i = 0; i < 2; i++) {
            const share = nodeShares[i];
            const sig = await ThresholdCrypto.signPartial(msgA, share.share, share.nodeId, T, NODE_IDS);
            const res = await engine.recordAttestation({
                eventId,
                verifierId: share.nodeId,
                status: 'PASS',
                partialSignature: sig,
                expectedNode: 'target',
                confidence: 1.0,
                timestamp: Date.now()
            });
            expect(res).toBeNull(); 
        }

        // 2. First node of Subset 2 (Node 3) attempts to sign Message B for the SAME ceremony
        const share3 = nodeShares[2];
        const sig3 = await ThresholdCrypto.signPartial(msgB, share3.share, share3.nodeId, T, NODE_IDS);
        const res = await engine.recordAttestation({
            eventId,
            verifierId: share3.nodeId,
            status: 'PASS',
            partialSignature: sig3,
            expectedNode: 'target',
            confidence: 1.0,
            timestamp: Date.now()
        });

        // 3. VERIFY: The engine MUST abort the ceremony immediately due to proposal mismatch
        expect(res).not.toBeNull();
        expect(res?.status).toBe('ABORTED');
        expect(res?.isTrusted).toBe(false);
        
        // 4. VERIFY: Any further attestations (even valid ones for B) are ignored
        const share4 = nodeShares[3];
        const sig4 = await ThresholdCrypto.signPartial(msgB, share4.share, share4.nodeId, T, NODE_IDS);
        const finalRes = await engine.recordAttestation({
            eventId,
            verifierId: share4.nodeId,
            status: 'PASS',
            partialSignature: sig4,
            expectedNode: 'target',
            confidence: 1.0,
            timestamp: Date.now()
        });
        expect(finalRes).toBeNull();
    }, 20000);
});
