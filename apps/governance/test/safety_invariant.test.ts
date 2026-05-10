import { describe, it, expect } from 'vitest';
import { ConsensusEngine } from '../src/consensus-engine';

describe('ZTAN Phase 18: Safety Specification & Invariant Registry', () => {
    const BASE_T = 2;
    const NODE_IDS = ['node-1', 'node-2', 'node-3', 'node-4', 'node-5'];

    it('Safety: Invariant Registry Disclosure', async () => {
        const engine = new ConsensusEngine(BASE_T, 5, NODE_IDS);
        const profile = engine.getSafetyProfile();

        expect(profile.invariants.length).toBeGreaterThan(0);
        expect(profile.invariants.some(i => i.id === 'INV-001')).toBe(true);
        expect(profile.invariants.find(i => i.id === 'INV-001').type).toBe('SAFETY');
    });

    it('Safety: Protocol Specification Transparency', async () => {
        const engine = new ConsensusEngine(BASE_T, 5, NODE_IDS);
        const profile = engine.getSafetyProfile();

        expect(profile.specification.guarantees.length).toBeGreaterThan(0);
        expect(profile.specification.assumptions.length).toBeGreaterThan(0);
        expect(profile.specification.nonGuarantees.length).toBeGreaterThan(0);
        
        // Verify key guarantee
        expect(profile.specification.guarantees).toContain('Historical immutability of governance artifacts through Merkleized hash-chaining.');
    });

    it('Invariant: Operational Adherence Verification (INV-001)', async () => {
        const engine = new ConsensusEngine(BASE_T, 5, NODE_IDS);
        const eventId = 'inv-test-001';

        // 1. Initial check (no slashing yet)
        expect(engine.verifyInvariantAdherence('INV-001')).toBe(true);

        // 2. Perform Slashing
        engine.enforceSlashing('node-5', { eventId });

        // 3. Verify Adherence (should check if receipts are signed)
        expect(engine.verifyInvariantAdherence('INV-001')).toBe(true);
    });

    it('Audit: Safety Profile Handoff Accuracy', async () => {
        const engine = new ConsensusEngine(BASE_T, 5, NODE_IDS);
        const profile = engine.getSafetyProfile();

        expect(profile.protocolVersion).toBe('v1.5.0');
        expect(profile.artifactHandoff.specHash).toBeDefined();
        expect(profile.artifactHandoff.archiveRoot).toBeDefined();
    });
});
