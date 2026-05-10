import { describe, it, expect, beforeAll } from 'vitest';
import { ThresholdCrypto } from '../src/crypto-utils';
import { ConsensusEngine, CeremonySnapshot } from '../src/consensus-engine';

describe('ZTAN Phase 10: Governance Economics & Adversary Modeling', () => {
    let nodeShares: any[];
    
    const BASE_T = 2;
    const N = 5;
    const NODE_IDS = ['node-1', 'node-2', 'node-3', 'node-4', 'node-5'];

    beforeAll(async () => {
        nodeShares = await ThresholdCrypto.performDKG(NODE_IDS, BASE_T);
    });

    it('Governance: Trust-Weighted Quorum Consensus', async () => {
        const eventId = 'weighted-quorum-001';
        const msg = '0'.repeat(64);
        const engine = new ConsensusEngine(BASE_T, N, NODE_IDS);

        // 1. Give Node 1 a higher weight but not enough to reach threshold alone
        // Threshold is 2 * 100 = 200
        engine.updateWeight('node-1', 150);

        // 2. Node 1 signs (Total weight 150 < 200)
        const s = nodeShares[0];
        const sig = await ThresholdCrypto.signPartial(msg, s.share, s.nodeId, BASE_T, NODE_IDS);
        const res1 = await engine.recordAttestation({
            eventId, verifierId: s.nodeId, status: 'PASS', partialSignature: sig,
            expectedNode: 'target', confidence: 1.0, timestamp: Date.now()
        });
        expect(res1).toBeNull(); // Threshold not reached

        // 3. Node 2 signs (Total weight 150 + 100 = 250 >= 200)
        const s2 = nodeShares[1];
        const sig2 = await ThresholdCrypto.signPartial(msg, s2.share, s2.nodeId, BASE_T, NODE_IDS);
        const res2 = await engine.recordAttestation({
            eventId, verifierId: s2.nodeId, status: 'PASS', partialSignature: sig2,
            expectedNode: 'target', confidence: 1.0, timestamp: Date.now()
        });

        expect(res2).not.toBeNull();
        expect(res2?.status).toBe('COMPLETED');
    }, 20000);

    it('Adversary: Accountable Slashing & Byzantine Rejection', async () => {
        const eventId = 'slashing-test-001';
        const msg = '0'.repeat(64);
        const engine = new ConsensusEngine(BASE_T, N, NODE_IDS);

        const proof = {
            eventId, nodeId: 'node-1', seq: 5, localRoot: 'A', remoteRoot: 'B', 
            timestamp: Date.now(), proofId: 'proof-1'
        };
        engine.enforceSlashing('node-1', proof);

        const s1 = nodeShares[0];
        const sig1 = await ThresholdCrypto.signPartial(msg, s1.share, s1.nodeId, BASE_T, NODE_IDS);
        const res = await engine.recordAttestation({
            eventId, verifierId: s1.nodeId, status: 'PASS', partialSignature: sig1,
            expectedNode: 'target', confidence: 1.0, timestamp: Date.now()
        });

        expect(res).toBeNull();
        expect((engine as any).stateMap.get(eventId)).toBeUndefined();
    }, 20000);

    it('Economics: Long-Horizon Trust Decay', async () => {
        const engine = new ConsensusEngine(BASE_T, N, NODE_IDS);
        for (let i = 0; i < 1000; i++) engine.applyTrustDecay();

        const finalWeight = (engine as any).trustWeights.get('node-1');
        expect(finalWeight).toBeLessThan(100);
        expect(finalWeight).toBeCloseTo(100 * Math.pow(0.9995, 1000), 2);
    }, 20000);

    it('Adversary: Collusion & Equivocation Attribution', async () => {
        const eventId = 'collusion-test-001';
        const engine = new ConsensusEngine(BASE_T, N, NODE_IDS);

        for (let i = 0; i < 5; i++) {
            await engine.recordAttestation({
                eventId, verifierId: NODE_IDS[i], status: 'PASS', 
                expectedNode: 'target', confidence: 1.0, timestamp: Date.now()
            });
        }
        const localSnapshot = (engine as any).snapshots.get(eventId)[0];

        const maliciousSnapshot = {
            ...localSnapshot,
            snapshotId: 'malicious-id',
            stateRoot: 'CONFLICTING_ROOT',
            checkpointSignatures: new Map()
        };
        engine.receiveRemoteSnapshot(maliciousSnapshot as any);

        expect((engine as any).slashedNodes.has('REMOTE_NODE_ID')).toBe(true);
        expect((engine as any).trustWeights.get('REMOTE_NODE_ID')).toBe(0);
    }, 20000);
});
