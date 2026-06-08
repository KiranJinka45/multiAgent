import { describe, it, expect, beforeAll } from 'vitest';
import crypto from 'crypto';
import { ThresholdCrypto } from '../src/crypto-utils';
import { ConsensusEngine, CeremonySnapshot } from '../src/consensus-engine';

describe('ZTAN Phase 8: Adversarial Convergence & Upgrade Safety', () => {
    let nodeShares: any[];
    
    // Use high threshold to prevent premature finalization
    const T = 10;
    const N = 12;
    const NODE_IDS = Array.from({length: 12}, (_, i) => `node-${i+1}`);

    beforeAll(async () => {
        nodeShares = await ThresholdCrypto.performDKG(NODE_IDS, T);
    });

    it('Safety: Checkpoint Equivocation Detection', async () => {
        const eventId = 'equivocation-test-001';
        const msg = '0'.repeat(64);
        const engine = new ConsensusEngine(T, N, NODE_IDS);

        // Record 5 attestations (T=10, Snapshot at 5)
        for (let i = 0; i < 5; i++) {
            const s = nodeShares[i];
            const sig = await ThresholdCrypto.signPartial(msg, s.share, s.nodeId, T, NODE_IDS);
            await engine.recordAttestation({
                eventId, verifierId: s.nodeId, status: 'PASS', partialSignature: sig,
                expectedNode: 'target', confidence: 1.0, timestamp: Date.now()
            });
        }
        
        const snapshots = (engine as any).snapshots.get(eventId);
        const localSnapshot = snapshots[snapshots.length - 1];
        expect(localSnapshot.attestationCount).toBe(5);

        // Simulate a malicious REMOTE snapshot
        const maliciousSnapshot: CeremonySnapshot = {
            ...localSnapshot,
            snapshotId: 'malicious-id-001',
            stateRoot: 'CORRUPTED_ROOT_HASH'.repeat(2),
            checkpointSignatures: new Map()
        };

        engine.receiveRemoteSnapshot(maliciousSnapshot);

        const state = (engine as any).stateMap.get(eventId);
        expect(state.metrics.equivocationAlerts).toBe(1);
    }, 20000);

    it('Upgrade: Rolling Protocol Version Transition', async () => {
        const eventId = 'upgrade-test-001';
        const _msg = '0'.repeat(64);
        const engine = new ConsensusEngine(T, N, NODE_IDS);

        await engine.recordAttestation({
            eventId, verifierId: NODE_IDS[0], status: 'PASS', 
            expectedNode: 'target', confidence: 1.0, timestamp: Date.now()
        });

        engine.setProtocolVersion('v1.6.0');

        // Record 4 more (Total 5, triggers snapshot)
        for (let i = 1; i < 5; i++) {
            await engine.recordAttestation({
                eventId, verifierId: NODE_IDS[i], status: 'PASS', 
                expectedNode: 'target', confidence: 1.0, timestamp: Date.now()
            });
        }

        const snapshots = (engine as any).snapshots.get(eventId);
        const latestSnapshot = snapshots[snapshots.length - 1];
        expect(latestSnapshot.protocolVersion).toBe('v1.6.0');
    }, 20000);

    it('Identity: Canonical Snapshot ID Determinism', async () => {
        const eventId = 'id-test-001';
        const engine = new ConsensusEngine(T, N, NODE_IDS);
        
        for (let i = 0; i < 5; i++) {
            await engine.recordAttestation({
                eventId, verifierId: NODE_IDS[i], status: 'PASS', 
                expectedNode: 'target', confidence: 1.0, timestamp: Date.now()
            });
        }

        const snapshots = (engine as any).snapshots.get(eventId);
        const snapshot1 = snapshots[0];
        
        const data = `v1.5.0|${eventId}|5|${snapshot1.stateRoot}|${[...NODE_IDS].sort().join(',')}`;
        const expectedId = crypto.createHash('sha256').update(data).digest('hex');
        
        expect(snapshot1.snapshotId).toBe(expectedId);
    }, 20000);
});
