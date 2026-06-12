import { describe, it, expect, beforeEach } from 'vitest';
import { ExecutionCell } from './cell';
import { TrustRegistry } from './trust-registry';
import { EvidencePacketGenerator } from '../../evidence-lifecycle/src/evidence-packet';
import { CryptoUtils } from '../../evidence-lifecycle/src/crypto-utils';
import type { FinalizedEnvelope } from '../../evidence-lifecycle/src/evidence-packet';

describe('ExecutionCell', () => {
    let cell: ExecutionCell;
    let keyPair: { publicKey: string, privateKey: string };
    let generator: EvidencePacketGenerator;

    beforeEach(() => {
        cell = new ExecutionCell();
        keyPair = CryptoUtils.generateKeyPair();
        generator = new EvidencePacketGenerator();
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
        registry.anchorEpoch('epoch-test', '0xtrusted', [keyPair.publicKey]);
        cell.syncTrustRegistry(registry.serialize());

        const validForeignPacket = generator.generateSignedEnvelope(
            'foreign-m-1',
            'epoch-test',
            { rootHash: '0xtrusted', inclusionHash: '0x123', siblings: [] },
            { locDelta: 0, fileGlobs: [], pathTraversalDetected: false },
            { preMutationSnapshotId: 'snap', revertHash: '0xrev' },
            { isolationLevel: 'gvisor' },
            { tokenConsumption: 10, costCeiling: 100, withinBudget: true },
            keyPair.privateKey
        );

        const result = cell.verifyForeignEvidence(validForeignPacket);
        expect(result).toBe(true);
    });

    it('rejects foreign evidence with unknown governance roots', () => {
        const untrustedPacket = generator.generateSignedEnvelope(
            'foreign-m-2',
            'epoch-test',
            { rootHash: '0xuntrusted', inclusionHash: '0x123', siblings: [] },
            { locDelta: 0, fileGlobs: [], pathTraversalDetected: false },
            { preMutationSnapshotId: 'snap', revertHash: '0xrev' },
            { isolationLevel: 'gvisor' },
            { tokenConsumption: 10, costCeiling: 100, withinBudget: true },
            keyPair.privateKey
        );

        const result = cell.verifyForeignEvidence(untrustedPacket);
        expect(result).toBe(false);
    });

    it('prevents verifying foreign evidence when quarantined', () => {
        const registry = new TrustRegistry();
        registry.anchorEpoch('epoch-test', '0xtrusted', [keyPair.publicKey]);
        cell.syncTrustRegistry(registry.serialize());
        cell.quarantine('Isolation mode');

        const validForeignPacket = generator.generateSignedEnvelope(
            'foreign-m-1',
            'epoch-test',
            { rootHash: '0xtrusted', inclusionHash: '0x123', siblings: [] },
            { locDelta: 0, fileGlobs: [], pathTraversalDetected: false },
            { preMutationSnapshotId: 'snap', revertHash: '0xrev' },
            { isolationLevel: 'gvisor' },
            { tokenConsumption: 10, costCeiling: 100, withinBudget: true },
            keyPair.privateKey
        );

        expect(() => cell.verifyForeignEvidence(validForeignPacket)).toThrow(/Cannot verify foreign evidence/);
    });
});
