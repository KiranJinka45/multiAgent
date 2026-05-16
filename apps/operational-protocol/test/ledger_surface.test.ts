import { describe, it, expect } from 'vitest';
import { ConsensusEngine } from '../src/consensus-engine';

describe('ZTAN Phase 23: Proof Status Ledger & Constitutional Surface Freeze', () => {
    const BASE_T = 2;
    const NODE_IDS = ['node-1', 'node-2', 'node-3', 'node-4', 'node-5'];

    it('Ledger: Proof Status Disclosure', async () => {
        const engine = new ConsensusEngine(BASE_T, 5, NODE_IDS);
        const bundle = engine.getAuditReadinessBundle();

        expect(bundle.proofLedger.length).toBe(4);
        const claim1 = bundle.proofLedger.find(l => l.claimId === 'CLAIM-001');
        expect(claim1.empirical).toBe('VERIFIED');
        expect(claim1.formal).toBe('INITIALIZATION');
        expect(claim1.operational).toBe('PILOT');
    });

    it('Governance: v1.0 Constitutional Surface Freeze', async () => {
        const engine = new ConsensusEngine(BASE_T, 5, NODE_IDS);
        expect((engine as any).isSurfaceFrozen).toBe(false);

        // 1. Freeze Surface
        engine.freezeConstitutionalSurface();
        const bundle = engine.getAuditReadinessBundle();

        expect(bundle.isSurfaceFrozen).toBe(true);
        expect(bundle.constitution.invariants).toContain('INV-001');
    });

    it('Audit: Readiness Bundle Integrity', async () => {
        const engine = new ConsensusEngine(BASE_T, 5, NODE_IDS);
        const bundle = engine.getAuditReadinessBundle();

        expect(bundle.protocolVersion).toBe('v1.5.0');
        expect(bundle.releaseVersion).toBe('v1.0.0-audit');
        expect(bundle.constitution.threatModel).toBe('PUBLISHED');
        expect(bundle.constitution.nonGoals).toBe('DISCLOSED');
    });

    it('Transparency: Lifecycle Maturity Mapping', async () => {
        const engine = new ConsensusEngine(BASE_T, 5, NODE_IDS);
        const bundle = engine.getAuditReadinessBundle();

        const claim4 = bundle.proofLedger.find(l => l.claimId === 'CLAIM-004');
        expect(claim4.audit).toBe('ABSENT');
    });
});
