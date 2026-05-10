import { describe, it, expect } from 'vitest';
import { ConsensusEngine } from '../src/consensus-engine';

describe('ZTAN Phase 19: Threat Modeling & Invariant Registry Freeze', () => {
    const BASE_T = 2;
    const NODE_IDS = ['node-1', 'node-2', 'node-3', 'node-4', 'node-5'];

    it('Threat Model: Adversary & Trust Boundary Disclosure', async () => {
        const engine = new ConsensusEngine(BASE_T, 5, NODE_IDS);
        const context = engine.getFullSecurityContext();

        expect(context.threatModel.adversaries.length).toBeGreaterThan(0);
        expect(context.threatModel.adversaries.some(a => a.id === 'Cartel-Colluder')).toBe(true);
        expect(context.threatModel.trustBoundaries).toContain('Watcher nodes are trusted only for telemetry, not for protocol finalization.');
    });

    it('Governance: Invariant Registry v1.0 Freeze', async () => {
        const engine = new ConsensusEngine(BASE_T, 5, NODE_IDS);
        expect((engine as any).isRegistryFrozen).toBe(false);

        // 1. Freeze Registry
        engine.freezeInvariants();
        const context = engine.getFullSecurityContext();

        expect(context.isRegistryFrozen).toBe(true);
        expect(context.invariants.length).toBe(4); // INV-001 through INV-004
    });

    it('Security: Consolidated Audit Context Integrity', async () => {
        const engine = new ConsensusEngine(BASE_T, 5, NODE_IDS);
        
        // 1. Generate some state
        engine.enforceSlashing('node-5', { eventId: 't1' });
        
        const context = engine.getFullSecurityContext();
        
        expect(context.operationalContext.archiveRoot).toBe((engine as any).archiveRoot);
        expect(context.operationalContext.activeSlashedCount).toBe(1);
        expect(context.threatModel.criticalVulnerabilities.length).toBeGreaterThan(0);
    });

    it('Adversary: Mitigation Strategy Mapping', async () => {
        const engine = new ConsensusEngine(BASE_T, 5, NODE_IDS);
        const context = engine.getFullSecurityContext();

        const colluder = context.threatModel.adversaries.find(a => a.id === 'Cartel-Colluder');
        expect(colluder.mitigation).toBe('33% governance weight cap per validator node.');
    });
});
