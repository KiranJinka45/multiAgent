import { describe, it, expect } from 'vitest';
import { ConsensusEngine } from '../src/consensus-engine';

describe('ZTAN Phase 24: Public Verification Dashboard & Constitutional Permanency', () => {
    const BASE_T = 2;
    const NODE_IDS = ['node-1', 'node-2', 'node-3', 'node-4', 'node-5'];

    it('Dashboard: Public Verification Status Disclosure', async () => {
        const engine = new ConsensusEngine(BASE_T, 5, NODE_IDS);
        const bundle = engine.getPublicCertificationBundle();

        expect(bundle.verificationDashboard.length).toBe(4);
        const replayEntry = bundle.verificationDashboard.find(d => d.claim === 'Replay Determinism');
        expect(replayEntry.empirical).toBe(true);
        expect(replayEntry.formal).toBe('INITIAL');
        expect(replayEntry.operational).toBe(true);
    });

    it('Governance: v1.0 Constitutional Permanency Freeze', async () => {
        const engine = new ConsensusEngine(BASE_T, 5, NODE_IDS);
        expect((engine as any).isPermanentlyFrozen).toBe(false);

        // 1. Freeze Permanency
        engine.freezeConstitutionalPermanency();
        const bundle = engine.getPublicCertificationBundle();

        expect(bundle.permanencyStatus).toBe('PERMANENT_V1');
        expect(bundle.auditReadiness.constitutionFrozen).toBe(true);
    });

    it('Certification: Public Bundle Integrity', async () => {
        const engine = new ConsensusEngine(BASE_T, 5, NODE_IDS);
        const bundle = engine.getPublicCertificationBundle();

        expect(bundle.protocolVersion).toBe('v1.5.0');
        expect(bundle.releaseVersion).toBe('v1.0.0-audit');
        expect(bundle.auditReadiness.threatModelPublished).toBe(true);
        expect(bundle.auditReadiness.proofStatusLedger).toBe('AVAILABLE');
    });

    it('Transparency: Operational Maturity Mapping', async () => {
        const engine = new ConsensusEngine(BASE_T, 5, NODE_IDS);
        const bundle = engine.getPublicCertificationBundle();

        const byzantineEntry = bundle.verificationDashboard.find(d => d.claim === 'Byzantine Accountability');
        expect(byzantineEntry.operational).toBe('PILOT');
        expect(byzantineEntry.audit).toBe(false);
    });
});
