import { describe, it, expect, beforeEach } from 'vitest';
import { OfflineAuditor } from './auditor';
import { TrustRegistry } from '../../federation/src/trust-registry';
import { FinalizedEnvelope } from '../../evidence-lifecycle/src/evidence-packet';

describe('OfflineAuditor', () => {
    let registry: TrustRegistry;
    let auditor: OfflineAuditor;
    let validPacket: FinalizedEnvelope;

    beforeEach(() => {
        registry = new TrustRegistry();
        registry.anchorEpoch('epoch-v1', '0xrootv1');
        auditor = new OfflineAuditor(registry.serialize());

        validPacket = {
            missionId: 'm-123',
            timestamp: Date.now(),
            governanceEpoch: 'epoch-v1',
            merkleLineage: { rootHash: '0xrootv1', inclusionHash: '0xinc', siblings: [] },
            containmentProof: { locDelta: 0, fileGlobs: [], pathTraversalDetected: false, signature: 'sig_containment' },
            recoveryAssurance: { preMutationSnapshotId: 'snap', revertHash: '0xrev', engineSignature: 'sig_recovery' },
            sandboxAttestation: { isolationLevel: 'gvisor', providerSignature: 'sig_sandbox' },
            economicRationality: { tokenConsumption: 10, costCeiling: 100, withinBudget: true }
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
        registry.revokeSignature('sig_containment');
        auditor = new OfflineAuditor(registry.serialize()); // reload auditor with updated registry

        const report = auditor.auditPacket(JSON.stringify(validPacket));
        expect(report.isValid).toBe(false);
        expect(report.reasons).toContain('Packet contains revoked signatures.');
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
