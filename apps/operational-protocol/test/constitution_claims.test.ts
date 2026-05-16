import { describe, it, expect } from 'vitest';
import { ConsensusEngine } from '../src/consensus-engine';

describe('ZTAN Phase 21: Protocol Constitution & Claims Matrix', () => {
    const BASE_T = 2;
    const NODE_IDS = ['node-1', 'node-2', 'node-3', 'node-4', 'node-5'];

    it('Constitution: Constitutional Semantic Freeze', async () => {
        const engine = new ConsensusEngine(BASE_T, 5, NODE_IDS);
        expect((engine as any).isConstitutionalFreeze).toBe(false);

        // 1. Freeze Constitution
        engine.freezeConstitutionalSemantics();
        const pkg = engine.getAuditIntakePackage();

        expect(pkg.constitution.freezeStatus).toBe(true);
        expect(pkg.constitution.invariants).toContain('Replay Determinism (v1.0)');
    });

    it('Claims: Claims Matrix Evidence Mapping', async () => {
        const engine = new ConsensusEngine(BASE_T, 5, NODE_IDS);
        const pkg = engine.getAuditIntakePackage();

        expect(pkg.claimsMatrix.length).toBeGreaterThan(0);
        const replayClaim = pkg.claimsMatrix.find(c => c.id === 'CLAIM-001');
        expect(replayClaim.evidence).toBe('Adversarial Test Vector Corpus');
        expect(replayClaim.proofStatus).toBe('SIMULATED');

        const immutabilityClaim = pkg.claimsMatrix.find(c => c.id === 'CLAIM-002');
        expect(immutabilityClaim.proofStatus).toBe('EMPIRICAL');
    });

    it('Audit: Comprehensive Intake Package Integrity', async () => {
        const engine = new ConsensusEngine(BASE_T, 5, NODE_IDS);
        
        // 1. Generate some state
        engine.enforceSlashing('node-5', { eventId: 'audit-001' });
        
        const pkg = engine.getAuditIntakePackage();
        
        expect(pkg.auditReadiness.archiveRoot).toBe((engine as any).archiveRoot);
        expect(pkg.auditReadiness.threatModelPublished).toBe(true);
        expect(pkg.auditReadiness.nonGoalsDisclosed).toBe(true);
    });

    it('Governance: Constitutional Invariant Listing', async () => {
        const engine = new ConsensusEngine(BASE_T, 5, NODE_IDS);
        const pkg = engine.getAuditIntakePackage();

        expect(pkg.constitution.invariants.length).toBe(4);
        expect(pkg.constitution.invariants).toContain('Receipt Non-Repudiability (Signed Governance Evidence)');
    });
});
