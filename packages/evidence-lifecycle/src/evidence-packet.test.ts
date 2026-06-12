import { describe, it, expect } from 'vitest';
import { 
    EvidencePacketGenerator, 
    MerkleProof, 
    ContainmentProof, 
    RollbackProof, 
    SandboxAttestation, 
    EconomicRationality 
} from './evidence-packet';

describe('EvidencePacketGenerator', () => {
    const generator = new EvidencePacketGenerator();

    const validMerkle: MerkleProof = {
        rootHash: '0x123',
        inclusionHash: '0xabc',
        siblings: ['0xdef']
    };

    const validContainment: ContainmentProof = {
        locDelta: 50,
        fileGlobs: ['src/**/*.ts'],
        pathTraversalDetected: false,
        signature: 'sig_123'
    };

    const validRollback: RollbackProof = {
        preMutationSnapshotId: 'snap_1',
        revertHash: '0xrev',
        engineSignature: 'sig_rev'
    };

    const validSandbox: SandboxAttestation = {
        isolationLevel: 'gvisor',
        providerSignature: 'sig_sand'
    };

    const validEconomic: EconomicRationality = {
        tokenConsumption: 50,
        costCeiling: 100,
        withinBudget: true
    };

    it('generates a valid FinalizedEnvelope when all pillars are met', () => {
        const envelope = generator.generateEnvelope(
            'mission-1',
            'epoch-alpha',
            validMerkle,
            validContainment,
            validRollback,
            validSandbox,
            validEconomic
        );

        expect(envelope.missionId).toBe('mission-1');
        expect(envelope.merkleLineage).toBe(validMerkle);
        expect(envelope.containmentProof).toBe(validContainment);
        expect(envelope.recoveryAssurance).toBe(validRollback);
        expect(envelope.sandboxAttestation).toBe(validSandbox);
        expect(envelope.economicRationality).toBe(validEconomic);
        expect(envelope.timestamp).toBeGreaterThan(0);
    });

    it('fails if containment shows path traversal', () => {
        const invalidContainment = { ...validContainment, pathTraversalDetected: true };
        
        expect(() => {
            generator.generateEnvelope('mission-1', 'epoch-alpha', validMerkle, invalidContainment, validRollback, validSandbox, validEconomic);
        }).toThrow(/path traversal detected/);
    });

    it('fails if economic rationality budget is exceeded', () => {
        const invalidEconomic = { ...validEconomic, withinBudget: false };
        
        expect(() => {
            generator.generateEnvelope('mission-1', 'epoch-alpha', validMerkle, validContainment, validRollback, validSandbox, invalidEconomic);
        }).toThrow(/budget exceeded/);
    });

    it('fails if any pillar is missing', () => {
        expect(() => {
            // @ts-expect-error testing invalid input
            generator.generateEnvelope('mission-1', 'epoch-alpha', null, validContainment, validRollback, validSandbox, validEconomic);
        }).toThrow(/All 5 evidence pillars must be provided/);
    });
});
