import { describe, it, expect } from 'vitest';
import { ConsensusEngine } from '../src/consensus-engine';

describe('ZTAN Phase 27: Refinement-Enforced Operational Governance', () => {
    const BASE_T = 2;
    const NODE_IDS = ['node-1', 'node-2', 'node-3', 'node-4', 'node-5'];

    it('Dashboard: Refinement Coverage Manifest & Guarded Semantics', async () => {
        const engine = new ConsensusEngine(BASE_T, 5, NODE_IDS);
        const manifest = engine.getRefinementManifest();

        expect(manifest.transitionCoverage.length).toBe(4);
        const finalization = manifest.transitionCoverage.find(t => t.transition === 'FINALIZATION');
        expect(finalization.coverage).toBe('FULL');
        expect(finalization.method).toBe('SEMANTIC_GUARD');

        const bundle = engine.getPublicCertificationBundle();
        const safetyClaim = bundle.verificationDashboard.find(d => d.claim === 'Single-Finalization Safety');
        expect(safetyClaim.verificationMethod).toBe('MODEL_CHECK');
        
        const byzantineClaim = bundle.verificationDashboard.find(d => d.claim === 'Byzantine Accountability');
        expect(byzantineClaim.verificationMethod).toBe('RUNTIME_GUARD');
    });

    it('Formal: Expanded Semantic Correspondence Guards', async () => {
        const engine = new ConsensusEngine(BASE_T, 5, NODE_IDS);
        
        // Slashing Guard
        expect(engine.verifySemanticCorrespondence('SLASHING', { nodeId: 'node-1', trustWeight: 0 })).toBe(true);
        expect(() => engine.verifySemanticCorrespondence('SLASHING', { nodeId: 'node-1', trustWeight: 50 }))
            .toThrow("[VIOLATION] SlashedZeroWeight Invariant: Slashed nodes must have zero trust weight");

        // Emergency Recovery Guard
        expect(engine.verifySemanticCorrespondence('EMERGENCY_RECOVERY', { eventId: 'evt-1', attestations: 3 })).toBe(true);
        expect(() => engine.verifySemanticCorrespondence('EMERGENCY_RECOVERY', { eventId: 'evt-1', attestations: 2 }))
            .toThrow("[VIOLATION] Quorum Safety: Emergency recovery requires >= 3 attestations");
    });

    it('Governance: Refinement-Enforced Operational Transitions', async () => {
        const engine = new ConsensusEngine(BASE_T, 5, NODE_IDS);
        
        // Slashing triggering guard
        engine.enforceSlashing('node-5', { eventId: 'evt-1' });
        
        // Emergency Recovery triggering guard
        engine.attestEmergency('evt-2', 'node-1');
        engine.attestEmergency('evt-2', 'node-2');
        engine.attestEmergency('evt-2', 'node-3');

        const manifest = engine.getRefinementManifest();
        expect(manifest.guardedVsProven.totalGuards).toBe(2); // Slashing + Emergency
    });

    it('Transparency: Replay Corpus Export', async () => {
        const engine = new ConsensusEngine(BASE_T, 5, NODE_IDS);
        engine.enforceSlashing('node-4', { eventId: 'evt-3' });
        
        const corpus = engine.getReplayCorpus();
        expect(corpus.length).toBe(1);
    });

    it('Formal: TLA+ Semantic Mapping Freeze', async () => {
        const engine = new ConsensusEngine(BASE_T, 5, NODE_IDS);
        engine.freezeTlaSemanticMapping();
        
        const bundle = engine.getPublicCertificationBundle();
        expect(bundle.auditReadiness.tlaMappingFrozen).toBe(true);
    });

    it('Permanency: Constitutional Governance Freeze', async () => {
        const engine = new ConsensusEngine(BASE_T, 5, NODE_IDS);
        engine.freezeConstitutionalPermanency();
        
        const bundle = engine.getPublicCertificationBundle();
        expect(bundle.permanencyStatus).toBe('PERMANENT_V1');
    });
});
