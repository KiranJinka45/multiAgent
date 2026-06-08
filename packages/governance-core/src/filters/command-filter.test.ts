import { StaticCommandFilter } from './command-filter.js';
import { PermissionEngine } from '../permissions/lattice.js';
import { SideEffectOntology, SideEffectClass } from '../ontology/side-effects.js';
import { describe, it, expect, beforeEach } from 'vitest';

describe('Static Command Filter', () => {
    beforeEach(() => {
        // Reset or assume isolate environment for static checks
    });

    it('should deny unknown tools', async () => {
        const allowed = await StaticCommandFilter.evaluateProposal({
            toolName: 'hacker-tool',
            tenantId: 'tenant-1',
            payload: 'exploit'
        });
        
        expect(allowed).toBe(false);
    });

    it('should allow known tools within lattice bounds', async () => {
        SideEffectOntology.registerOperation({
            name: 'safe-tool',
            sideEffectClass: SideEffectClass.REVERSIBLE,
            description: 'A safe tool'
        });

        PermissionEngine.registerLattice({
            toolName: 'safe-tool',
            tenantScope: ['tenant-1'],
            filesystemScope: [],
            networkScope: [],
            runtimeMode: 'sandbox',
            approvalRequirement: false,
            payloadLimits: { maxSizeBytes: 100 },
            executionTimeLimitsMs: 1000,
            allowedFileTypes: [],
            environmentBoundaries: []
        });

        const allowed = await StaticCommandFilter.evaluateProposal({
            toolName: 'safe-tool',
            tenantId: 'tenant-1',
            payload: 'run'
        });

        expect(allowed).toBe(true);
    });
});
