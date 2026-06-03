import { describe, it, expect } from 'vitest';
import { CryptoUtils } from '../../evidence-lifecycle/src/crypto-utils';
import { EvidencePacketGenerator } from '../../evidence-lifecycle/src/evidence-packet';
import { TrustRegistry } from '../../federation/src/trust-registry';
import { OfflineAuditor } from './auditor';
import { ExecutionCell } from '../../federation/src/cell';

describe('Phase 08.6 Trust Finality Audit', () => {
    it('executes the full cryptographic trust chain validation suite', () => {
        // --- 1. Successful Verification Case ---
        // Generate a real EvidencePacket and sign it with actual keys.
        const generator = new EvidencePacketGenerator();
        const epochKeyPair = CryptoUtils.generateKeyPair();
        const governanceEpoch = 'epoch-crypto-v1';
        const rootHash = '0xtrue_crypto_root';

        const signedPacket = generator.generateSignedEnvelope(
            'mission-crypto-1',
            governanceEpoch,
            { rootHash, inclusionHash: '0xinc', siblings: [] },
            { locDelta: 10, fileGlobs: ['src/**/*.ts'], pathTraversalDetected: false },
            { preMutationSnapshotId: 'snap-1', revertHash: '0xrev-1' },
            { isolationLevel: 'firecracker' },
            { tokenConsumption: 50, costCeiling: 100, withinBudget: true },
            epochKeyPair.privateKey
        );

        // Ensure real cryptographic signatures were generated and aren't mock strings
        expect(signedPacket.containmentProof.signature.length).toBeGreaterThan(50);
        expect(signedPacket.recoveryAssurance.engineSignature.length).toBeGreaterThan(50);

        // Export TrustRegistry snapshot anchoring the real public key
        const registry = new TrustRegistry();
        registry.anchorEpoch(governanceEpoch, rootHash, [epochKeyPair.publicKey]);
        const snapshotJson = registry.serialize();

        // Verify packet offline with ztan-auditor
        const auditor = new OfflineAuditor(snapshotJson);
        const report1 = auditor.auditPacket(JSON.stringify(signedPacket));
        expect(report1.isValid).toBe(true);

        // --- 2. Tampered Payload Case ---
        const tamperedPacket = JSON.parse(JSON.stringify(signedPacket));
        tamperedPacket.containmentProof.locDelta = 999; // Attacker alters evidence
        
        const tamperedReport = auditor.auditPacket(JSON.stringify(tamperedPacket));
        expect(tamperedReport.isValid).toBe(false);
        expect(tamperedReport.reasons).toContain('Cryptographic signature verification failed or no trusted key matched.');

        // --- 3. Unknown Epoch Case ---
        const invalidEpochPacket = JSON.parse(JSON.stringify(signedPacket));
        invalidEpochPacket.governanceEpoch = 'epoch-unknown-v99';
        
        const unknownEpochReport = auditor.auditPacket(JSON.stringify(invalidEpochPacket));
        expect(unknownEpochReport.isValid).toBe(false);
        expect(unknownEpochReport.reasons).toContain('Untrusted governance root for epoch epoch-unknown-v99.');

        // --- 4. Revoked Key Case ---
        // Revoke the public key
        const compromisedRegistry = TrustRegistry.deserialize(snapshotJson);
        compromisedRegistry.revokePublicKey(epochKeyPair.publicKey);
        const compromisedSnapshotJson = compromisedRegistry.serialize();

        // Re-run verification using the updated (revoked) registry snapshot
        const auditor2 = new OfflineAuditor(compromisedSnapshotJson);
        const report2 = auditor2.auditPacket(JSON.stringify(signedPacket));

        // Ensure rejection occurs because of policy, not math
        expect(report2.isValid).toBe(false);
        expect(report2.reasons).toContain('Packet contains signatures from a revoked operator key.');

        // --- 5. Cross-Cell Verification Case ---
        const cell1 = new ExecutionCell();
        cell1.syncTrustRegistry(snapshotJson);
        
        // Pass to an independent cell simulating a federation transfer
        const result = cell1.verifyForeignEvidence(signedPacket);
        expect(result).toBe(true);

        // And verify it fails on a cell with the revoked snapshot
        const cell2 = new ExecutionCell();
        cell2.syncTrustRegistry(compromisedSnapshotJson);
        expect(cell2.verifyForeignEvidence(signedPacket)).toBe(false);
    });
});
