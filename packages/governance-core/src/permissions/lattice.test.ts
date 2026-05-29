import { PermissionEngine } from './lattice.js';
import { SideEffectOntology, SideEffectClass } from '../ontology/side-effects.js';
import { describe, it, expect, beforeEach } from 'vitest';

describe('Governance Substrate', () => {
    beforeEach(() => {
        // Clear registries if possible or just use unique names
    });

    it('should deny unknown tools by default', () => {
        const allowed = PermissionEngine.evaluateRequest('unknown-tool', 'tenant-1');
        expect(allowed).toBe(false);
    });

    it('should evaluate tenant scope correctly', () => {
        SideEffectOntology.registerOperation({
            name: 'tenant-tool',
            sideEffectClass: SideEffectClass.REVERSIBLE,
            description: 'Test tool'
        });

        PermissionEngine.registerLattice({
            toolName: 'tenant-tool',
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

        expect(PermissionEngine.evaluateRequest('tenant-tool', 'tenant-1')).toBe(true);
        expect(PermissionEngine.evaluateRequest('tenant-tool', 'tenant-2')).toBe(false);
    });

    it('should block irreversible operations without approval requirements', () => {
        SideEffectOntology.registerOperation({
            name: 'dangerous-tool',
            sideEffectClass: SideEffectClass.IRREVERSIBLE,
            description: 'Test dangerous tool'
        });

        PermissionEngine.registerLattice({
            toolName: 'dangerous-tool',
            tenantScope: ['tenant-1'],
            filesystemScope: [],
            networkScope: [],
            runtimeMode: 'sandbox',
            approvalRequirement: false, // This should trigger a denial
            payloadLimits: { maxSizeBytes: 100 },
            executionTimeLimitsMs: 1000,
            allowedFileTypes: [],
            environmentBoundaries: []
        });

        expect(PermissionEngine.evaluateRequest('dangerous-tool', 'tenant-1')).toBe(false);
    });
});
