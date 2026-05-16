import { describe, it, expect } from 'vitest';
import { ConsensusEngine } from '../src/consensus-engine';

describe('ZTAN Phase 22: Validation Confidence & Constitutional Claims', () => {
    const BASE_T = 2;
    const NODE_IDS = ['node-1', 'node-2', 'node-3', 'node-4', 'node-5'];

    it('Confidence: Validation Method Disclosure', async () => {
        const engine = new ConsensusEngine(BASE_T, 5, NODE_IDS);
        const pkg = engine.getFormalAuditPackage();

        expect(pkg.confidenceMatrix.length).toBe(5);
        const simulation = pkg.confidenceMatrix.find(c => c.method === 'EMPIRICAL_SIMULATION');
        expect(simulation.level).toBe('HIGH');
        expect(simulation.description).toContain('10,000+ adversarial coordination scenarios');

        const formal = pkg.confidenceMatrix.find(c => c.method === 'FORMAL_PROOF');
        expect(formal.level).toBe('ABSENT');
        expect(formal.description).toContain('TLA+ proofs are in initialization');
    });

    it('Governance: Constitutional Claims Freeze v1.0', async () => {
        const engine = new ConsensusEngine(BASE_T, 5, NODE_IDS);
        expect((engine as any).isClaimsFrozen).toBe(false);

        // 1. Freeze Claims
        engine.freezeConstitutionalClaims();
        const pkg = engine.getFormalAuditPackage();

        expect(pkg.claimsMatrix.frozen).toBe(true);
        expect(pkg.constitution.frozen).toBe(true);
    });

    it('Audit: Formal Intake Package Integrity', async () => {
        const engine = new ConsensusEngine(BASE_T, 5, NODE_IDS);
        const pkg = engine.getFormalAuditPackage();

        expect(pkg.protocolVersion).toBe('v1.5.0');
        expect(pkg.releaseVersion).toBe('v1.0.0-audit');
        expect(pkg.confidenceMatrix.some(c => c.method === 'EXTERNAL_AUDIT')).toBe(true);
    });

    it('Transparency: Scientific Rigor Mapping', async () => {
        const engine = new ConsensusEngine(BASE_T, 5, NODE_IDS);
        const pkg = engine.getFormalAuditPackage();

        const fuzzing = pkg.confidenceMatrix.find(c => c.method === 'ADVERSARIAL_FUZZING');
        expect(fuzzing.level).toBe('HIGH');
        expect(fuzzing.description).toContain('Seed-deterministic scheduling');
    });
});
