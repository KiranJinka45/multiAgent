import { describe, it, expect } from 'vitest';
import { ConsensusEngine } from '../src/consensus-engine';

describe('ZTAN Phase 20: Protocol Constraints & Upgrade Discipline', () => {
    const BASE_T = 2;
    const NODE_IDS = ['node-1', 'node-2', 'node-3', 'node-4', 'node-5'];

    it('Constraints: Explicit Non-Goals Disclosure', async () => {
        const engine = new ConsensusEngine(BASE_T, 5, NODE_IDS);
        const constitution = engine.getProtocolConstitution();

        expect(constitution.constraints.nonGoals.length).toBeGreaterThan(0);
        expect(constitution.constraints.nonGoals).toContain('The protocol does NOT solve social consensus or community-level disputes.');
        expect(constitution.constraints.outOfScopeAdversaries.length).toBeGreaterThan(0);
    });

    it('Upgrade: Compatibility Class Mapping', async () => {
        const engine = new ConsensusEngine(BASE_T, 5, NODE_IDS);
        
        // 1. Valid Forward Upgrade
        expect(engine.validateUpgradePath('v1.1.0-additive')).toBe(true);
        
        // 2. Valid Breaking Upgrade
        expect(engine.validateUpgradePath('v2.0.0-breaking')).toBe(true);

        // 3. Invalid Upgrade
        expect(engine.validateUpgradePath('v9.9.9-unknown')).toBe(false);
    });

    it('Governance: Audit Readiness Checklist', async () => {
        const engine = new ConsensusEngine(BASE_T, 5, NODE_IDS);
        const constitution = engine.getProtocolConstitution();

        expect(constitution.auditReadiness.frozenInvariants.length).toBe(4);
        expect(constitution.auditReadiness.threatModelPublished).toBe(true);
        expect(constitution.auditReadiness.nonGoalsDisclosed).toBe(true);
    });

    it('Environmental: Limitation Disclosure', async () => {
        const engine = new ConsensusEngine(BASE_T, 5, NODE_IDS);
        const constitution = engine.getProtocolConstitution();

        expect(constitution.constraints.environmentalLimitations.some(l => l.includes('High-latency'))).toBe(true);
    });
});
