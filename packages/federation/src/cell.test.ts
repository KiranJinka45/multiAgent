import { describe, it, expect, beforeEach } from 'vitest';
import { ExecutionCell } from './cell';
import { TrustRegistry } from './trust-registry';
import type { FinalizedEnvelope } from '../../evidence-lifecycle/src/evidence-packet';

describe('ExecutionCell', () => {
    let cell: ExecutionCell;

    beforeEach(() => {
        cell = new ExecutionCell();
    });

    it('starts in ACTIVE state', () => {
        expect(cell.getState()).toBe('ACTIVE');
    });

    it('can be quarantined', () => {
        cell.quarantine('Security breach suspected');
        expect(cell.getState()).toBe('QUARANTINED');
        expect(cell.getQuarantineReason()).toBe('Security breach suspected');
    });

    it('prevents starting local missions when quarantined', () => {
        cell.quarantine('Test');
        expect(() => cell.startLocalMission('m-1')).toThrow(/Cannot start mission/);
    });

    it('prevents syncing governance roots when quarantined', () => {
        cell.quarantine('Test');
        expect(() => cell.syncTrustRegistry('{}')).toThrow(/Cannot sync trust assets/);
    });

    it('verifies foreign evidence against known governance roots', () => {
        // Sync a trusted root
        const registry = new TrustRegistry();
        registry.anchorEpoch('epoch-test', '0xtrusted');
        cell.syncTrustRegistry(registry.serialize());

        const validForeignPacket: FinalizedEnvelope = {
            missionId: 'foreign-m-1',
            timestamp: Date.now(),
            governanceEpoch: 'epoch-test',
            merkleLineage: { rootHash: '0xtrusted', inclusionHash: '0x123', siblings: [] },
            containmentProof: { locDelta: 0, fileGlobs: [], pathTraversalDetected: false, signature: 'sig' },
            recoveryAssurance: { preMutationSnapshotId: 'snap', revertHash: '0xrev', engineSignature: 'sig' },
            sandboxAttestation: { isolationLevel: 'gvisor', providerSignature: 'sig' },
            economicRationality: { tokenConsumption: 10, costCeiling: 100, withinBudget: true }
        };

        const result = cell.verifyForeignEvidence(validForeignPacket);
        expect(result).toBe(true);
    });

    it('rejects foreign evidence with unknown governance roots', () => {
        const untrustedPacket: FinalizedEnvelope = {
            missionId: 'foreign-m-2',
            timestamp: Date.now(),
            governanceEpoch: 'epoch-test',
            merkleLineage: { rootHash: '0xuntrusted', inclusionHash: '0x123', siblings: [] },
            containmentProof: { locDelta: 0, fileGlobs: [], pathTraversalDetected: false, signature: 'sig' },
            recoveryAssurance: { preMutationSnapshotId: 'snap', revertHash: '0xrev', engineSignature: 'sig' },
            sandboxAttestation: { isolationLevel: 'gvisor', providerSignature: 'sig' },
            economicRationality: { tokenConsumption: 10, costCeiling: 100, withinBudget: true }
        };

        const result = cell.verifyForeignEvidence(untrustedPacket);
        expect(result).toBe(false);
    });

    it('prevents verifying foreign evidence when quarantined', () => {
        const registry = new TrustRegistry();
        registry.anchorEpoch('epoch-test', '0xtrusted');
        cell.syncTrustRegistry(registry.serialize());
        cell.quarantine('Isolation mode');

        const validForeignPacket = {
            missionId: 'foreign-m-1',
            timestamp: Date.now(),
            governanceEpoch: 'epoch-test',
            merkleLineage: { rootHash: '0xtrusted', inclusionHash: '0x123', siblings: [] },
            containmentProof: { locDelta: 0, fileGlobs: [], pathTraversalDetected: false, signature: 'sig' }
        } as FinalizedEnvelope;

        expect(() => cell.verifyForeignEvidence(validForeignPacket)).toThrow(/Cannot verify foreign evidence/);
    });
});
