import { DryRunSimulator } from './dry-run.js';
import { SideEffectOntology, SideEffectClass } from '../ontology/side-effects.js';
import { describe, it, expect } from 'vitest';

describe('Dry-Run Simulation Gate', () => {
    it('should flag irreversible operations for human escalation', () => {
        SideEffectOntology.registerOperation({
            name: 'delete-db',
            sideEffectClass: SideEffectClass.IRREVERSIBLE,
            description: 'Destructive operation'
        });

        const result = DryRunSimulator.simulateProposal({
            toolName: 'delete-db',
            tenantId: 'tenant-1',
            payload: 'run'
        });

        expect(result.isSafe).toBe(false);
        expect(result.requiresHumanEscalation).toBe(true);
    });

    it('should allow reversible operations to pass simulation', () => {
        SideEffectOntology.registerOperation({
            name: 'read-logs',
            sideEffectClass: SideEffectClass.REVERSIBLE,
            description: 'Safe operation'
        });

        const result = DryRunSimulator.simulateProposal({
            toolName: 'read-logs',
            tenantId: 'tenant-1',
            payload: 'run'
        });

        expect(result.isSafe).toBe(true);
        expect(result.requiresHumanEscalation).toBe(false);
    });
});
