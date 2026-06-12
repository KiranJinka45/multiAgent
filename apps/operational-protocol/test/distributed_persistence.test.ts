import { describe, it, expect, beforeAll } from 'vitest';
import { ThresholdCrypto } from '../src/crypto-utils';
import { ConsensusEngine } from '../src/consensus-engine';
import { CeremonyEvent } from '../src/types';

describe('ZTAN Phase 7: Distributed Persistence Simulation', () => {
    let nodeShares: any[];
    
    const T = 3;
    const N = 5;
    const NODE_IDS = ['node-1', 'node-2', 'node-3', 'node-4', 'node-5'];

    beforeAll(async () => {
        nodeShares = await ThresholdCrypto.performDKG(NODE_IDS, T);
    });

    it('Quorum: Attested Checkpoints (Multi-Node Consensus)', async () => {
        const eventId = 'attested-snapshot-001';
        const msg = '0'.repeat(64);
        const engine = new ConsensusEngine(T, N, NODE_IDS);

        // 1. Progress to threshold
        for (let i = 0; i < T; i++) {
            const s = nodeShares[i];
            const sig = await ThresholdCrypto.signPartial(msg, s.share, s.nodeId, T, NODE_IDS);
            await engine.recordAttestation({
                eventId, verifierId: s.nodeId, status: 'PASS', partialSignature: sig,
                expectedNode: 'target', confidence: 1.0, timestamp: Date.now()
            });
        }

        const snapshot = (engine as any).snapshots.get(eventId);
        expect(snapshot).toBeDefined();

        // 2. Attest the checkpoint (Node by Node)
        // Node 1 signs
        let reachedQuorum = await engine.attestCheckpoint(eventId, 'node-1', 'sig-node-1');
        expect(reachedQuorum).toBe(false); // Only 1/3

        // Node 2 signs
        reachedQuorum = await engine.attestCheckpoint(eventId, 'node-2', 'sig-node-2');
        expect(reachedQuorum).toBe(false); // Only 2/3

        // Node 3 signs
        reachedQuorum = await engine.attestCheckpoint(eventId, 'node-3', 'sig-node-3');
        expect(reachedQuorum).toBe(true); // 3/3 reached threshold T

        // 3. Final verification
        expect(ConsensusEngine.verifyCheckpointQuorum(snapshot)).toBe(true);
    }, 20000);

    it('Reconciliation: Anti-Entropy Sync under Partition', async () => {
        const eventId = 'reconcile-test-001';
        const msg = '0'.repeat(64);
        
        // Node A and Node B start identical
        const engineA = new ConsensusEngine(T, N, NODE_IDS);
        const engineB = new ConsensusEngine(T, N, NODE_IDS);

        // PARTITION: Node A receives Attestation 1
        const s1 = nodeShares[0];
        const sig1 = await ThresholdCrypto.signPartial(msg, s1.share, s1.nodeId, T, NODE_IDS);
        const att1 = {
            eventId, verifierId: s1.nodeId, status: 'PASS', partialSignature: sig1,
            expectedNode: 'target', confidence: 1.0, timestamp: Date.now()
        };
        await engineA.recordAttestation(att1);

        // PARTITION: Node B missed Attestation 1 but later receives Attestation 2
        const s2 = nodeShares[1];
        const sig2 = await ThresholdCrypto.signPartial(msg, s2.share, s2.nodeId, T, NODE_IDS);
        const _att2 = {
            eventId, verifierId: s2.nodeId, status: 'PASS', partialSignature: sig2,
            expectedNode: 'target', confidence: 1.0, timestamp: Date.now()
        };
        // Node B cannot apply att2 yet if it enforces strict sequencing 
        // (Our engine currently allows it if it creates the ceremony, but let's simulate sync)
        
        // SYNC: Node A pushes its ledger to Node B
        const ledgerA = (engineA as any).ledger.get(eventId);
        engineB.reconcile(eventId, ledgerA);

        // VERIFY: Node B now has Attestation 1
        const ledgerB = (engineB as any).ledger.get(eventId);
        expect(ledgerB.some((e: any) => e.payload.verifierId === 'node-1')).toBe(true);
    }, 20000);

    it('Versioning: Protocol & Schema Safety', async () => {
        const eventId = 'version-test-001';
        const engine = new ConsensusEngine(T, N, NODE_IDS);
        
        const _event = (engine as any).addEvent(eventId, 'CREATED', {});
        // In reality, this would be serialized from the JSON in addEvent
        // We check that the protocol version is tracked
        expect((engine as any).PROTOCOL_VERSION).toBe('v1.5.0');
    }, 20000);
});
