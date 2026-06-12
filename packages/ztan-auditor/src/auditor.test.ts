import { describe, it, expect, beforeEach } from 'vitest';
import { OfflineAuditor } from './auditor';
import { TrustRegistry } from '../../federation/src/trust-registry';
import { FinalizedEnvelope } from '../../evidence-lifecycle/src/evidence-packet';
import { CryptoUtils } from '../../evidence-lifecycle/src/crypto-utils';

describe('OfflineAuditor', () => {
    let registry: TrustRegistry;
    let auditor: OfflineAuditor;
    let validPacket: FinalizedEnvelope;
    let keyPair: { publicKey: string; privateKey: string };

    beforeEach(() => {
        keyPair = CryptoUtils.generateKeyPair();
        registry = new TrustRegistry();
        registry.anchorEpoch('epoch-v1', '0xrootv1', [keyPair.publicKey]);
        auditor = new OfflineAuditor(registry.serialize());

        const basePacket = {
            missionId: 'm-123',
            timestamp: Date.now(),
            governanceEpoch: 'epoch-v1',
            merkleLineage: { rootHash: '0xrootv1', inclusionHash: '0xinc', siblings: [] },
            containmentProof: { locDelta: 0, fileGlobs: [], pathTraversalDetected: false },
            recoveryAssurance: { preMutationSnapshotId: 'snap', revertHash: '0xrev' },
            sandboxAttestation: { isolationLevel: 'gvisor' as const },
            economicRationality: { tokenConsumption: 10, costCeiling: 100, withinBudget: true }
        };

        const sig1 = CryptoUtils.signPayload(basePacket.containmentProof, keyPair.privateKey);
        const sig2 = CryptoUtils.signPayload(basePacket.recoveryAssurance, keyPair.privateKey);
        const sig3 = CryptoUtils.signPayload(basePacket.sandboxAttestation, keyPair.privateKey);

        validPacket = {
            ...basePacket,
            containmentProof: { ...basePacket.containmentProof, signature: sig1 },
            recoveryAssurance: { ...basePacket.recoveryAssurance, engineSignature: sig2 },
            sandboxAttestation: { ...basePacket.sandboxAttestation, providerSignature: sig3 }
        };
    });

    it('validates a correct evidence packet offline', () => {
        const report = auditor.auditPacket(JSON.stringify(validPacket));
        expect(report.isValid).toBe(true);
        expect(report.reasons.length).toBe(0);
    });

    it('rejects an invalid JSON payload', () => {
        const report = auditor.auditPacket('not-json');
        expect(report.isValid).toBe(false);
        expect(report.reasons).toContain('Invalid JSON packet format.');
    });

    it('rejects packet with untrusted governance root', () => {
        validPacket.merkleLineage.rootHash = '0xfake_root';
        const report = auditor.auditPacket(JSON.stringify(validPacket));
        expect(report.isValid).toBe(false);
        expect(report.reasons[0]).toMatch(/Untrusted governance root/);
    });

    it('rejects packet with a revoked containment signature', () => {
        registry.revokePublicKey(keyPair.publicKey);
        auditor = new OfflineAuditor(registry.serialize()); // reload auditor with updated registry

        const report = auditor.auditPacket(JSON.stringify(validPacket));
        expect(report.isValid).toBe(false);
        expect(report.reasons).toContain('Packet contains signatures from a revoked operator key.');
    });

    it('rejects packet if containment proof failed locally', () => {
        validPacket.containmentProof.pathTraversalDetected = true;
        const report = auditor.auditPacket(JSON.stringify(validPacket));
        expect(report.isValid).toBe(false);
        expect(report.reasons).toContain('Containment breach detected (path traversal).');
    });

    it('rejects packet with missing signatures', () => {
        validPacket.recoveryAssurance.engineSignature = '';
        const report = auditor.auditPacket(JSON.stringify(validPacket));
        expect(report.isValid).toBe(false);
        expect(report.reasons).toContain('Missing recovery assurance signature.');
    });
});
