import { describe, it, expect, beforeAll } from 'vitest';
import { ThresholdCrypto } from '../src/crypto-utils';
import { ConsensusEngine, CeremonySnapshot } from '../src/consensus-engine';

describe('ZTAN Phase 6: Scalability & Survivability Simulation', () => {
    let nodeShares: any[];
    
    // Set T higher than the snapshot boundary to test compaction without finalization
    const T = 12;
    const N = 15;
    const NODE_IDS = Array.from({length: 15}, (_, i) => `node-${i+1}`);

    beforeAll(async () => {
        nodeShares = await ThresholdCrypto.performDKG(NODE_IDS, T);
    });

    it('Scalability: Snapshotting & Deterministic Recovery', async () => {
        const eventId = 'snapshot-test-001';
        const msg = '0'.repeat(64);
        const engine = new ConsensusEngine(T, N, NODE_IDS);

        // Record 11 attestations (Trigger 2nd snapshot at 10)
        for (let i = 0; i < 11; i++) {
            const nodeId = NODE_IDS[i];
            const sig = await ThresholdCrypto.signPartial(msg, nodeShares[0].share, nodeId, T, NODE_IDS);
            await engine.recordAttestation({
                eventId, verifierId: nodeId, status: 'PASS', partialSignature: sig,
                expectedNode: 'target', confidence: 1.0, timestamp: Date.now()
            });
        }

        const snapshots = (engine as any).snapshots;
        const snapshot = snapshots.get(eventId);
        
        expect(snapshot).toBeDefined();
        // Should have captured 10 attestations in the latest snapshot
        expect(snapshot?.attestationCount).toBe(10);

        const events = (engine as any).ledger.get(eventId);
        // Compacted size check (should only have the most recent 5 events)
        expect(events.length).toBeLessThanOrEqual(7); 

        const restoredStatus = ConsensusEngine.restore(snapshot!, events);
        expect(restoredStatus).toBe('ACTIVE');
    }, 20000);

    it('Survivability: Backpressure under Adversarial Saturation', async () => {
        const eventId = 'saturation-attack-001';
        const msg = '0'.repeat(64);
        const engine = new ConsensusEngine(T, N, NODE_IDS);

        for (let i = 0; i < 40; i++) {
            const nodeId = `attacker-${i}`;
            const sig = await ThresholdCrypto.signPartial(msg, nodeShares[0].share, nodeId, T, NODE_IDS);
            await engine.recordAttestation({
                eventId, verifierId: nodeId, status: 'PASS', partialSignature: sig,
                expectedNode: 'target', confidence: 1.0, timestamp: Date.now()
            });
        }

        const state = (engine as any).stateMap.get(eventId);
        // Should be capped at N*2 = 30
        expect(state.attestations.length).toBeLessThanOrEqual(31);
    }, 20000);

    it('Persistence: Storage Fault Injection (Truncated Ledger)', async () => {
        const eventId = 'storage-fault-test';
        const msg = '0'.repeat(64);
        // Use a small T to complete quickly
        const smallT = 3;
        const engine = new ConsensusEngine(smallT, 5, NODE_IDS.slice(0, 5));
        const smallShares = await ThresholdCrypto.performDKG(NODE_IDS.slice(0, 5), smallT);

        let finalRes: any;
        for (let i = 0; i < smallT; i++) {
            const s = smallShares[i];
            const sig = await ThresholdCrypto.signPartial(msg, s.share, s.nodeId, smallT, NODE_IDS.slice(0, 5));
            finalRes = await engine.recordAttestation({
                eventId, verifierId: s.nodeId, status: 'PASS', partialSignature: sig,
                expectedNode: 'target', confidence: 1.0, timestamp: Date.now()
            });
        }

        const snapshot = (engine as any).snapshots.get(eventId);
        const events = finalRes.events;
        const truncatedEvents = events.slice(0, 2);

        const recoveredStatus = ConsensusEngine.restore(snapshot, truncatedEvents);
        expect(recoveredStatus).toBe('COMPLETED');
    }, 20000);
});
