import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SemanticInspector } from '../../src/inspection/semantic-pipeline.js';
import { StaticCommandFilter } from '../../src/filters/command-filter.js';
import { PermissionEngine } from '../../src/permissions/lattice.js';
import { SideEffectOntology, SideEffectClass } from '../../src/ontology/side-effects.js';
import { DryRunSimulator } from '../../src/simulation/dry-run.js';
import { GovernanceLedger } from '../../src/ledger/ledger.js';
import { llmService } from '@packages/utils';

describe('Phase D1 & D2: Governance Chain & Boundary Integrity', () => {
    beforeEach(() => {
        GovernanceLedger.clearForTesting();
    });

    describe('D1: Full Governance Chain Campaigns', () => {
        it('should allow benign tasks with pristine pass', () => {
            SideEffectOntology.registerOperation({
                name: 'read-log',
                sideEffectClass: SideEffectClass.REVERSIBLE,
                description: 'Read log file'
            });
            PermissionEngine.registerLattice({
                toolName: 'read-log',
                tenantScope: ['tenant-a'],
                filesystemScope: ['/logs/'],
                networkScope: [],
                runtimeMode: 'sandbox',
                approvalRequirement: false,
                payloadLimits: { maxSizeBytes: 100 },
                executionTimeLimitsMs: 1000,
                allowedFileTypes: ['.log'],
                environmentBoundaries: []
            });

            const proposal = { toolName: 'read-log', tenantId: 'tenant-a', payload: 'run' };
            
            const filterRes = StaticCommandFilter.evaluateProposal(proposal);
            expect(filterRes).toBe(true);

            const simRes = DryRunSimulator.simulateProposal(proposal);
            expect(simRes.isSafe).toBe(true);
            expect(simRes.requiresHumanEscalation).toBe(false);

            GovernanceLedger.append('EXECUTION_STARTED', proposal.tenantId, 'hash-123', { tool: proposal.toolName });
            expect(GovernanceLedger.getEntries().filter(e => e.eventType === 'EXECUTION_STARTED').length).toBeGreaterThanOrEqual(1);
        });

        it('should block irreversible actions and escalate', () => {
            SideEffectOntology.registerOperation({
                name: 'delete-db',
                sideEffectClass: SideEffectClass.IRREVERSIBLE,
                description: 'Drop DB'
            });

            const proposal = { toolName: 'delete-db', tenantId: 'tenant-a', payload: 'run' };
            const simRes = DryRunSimulator.simulateProposal(proposal);
            
            expect(simRes.isSafe).toBe(false);
            expect(simRes.requiresHumanEscalation).toBe(true);
        });

        it('should deterministically reject dangerous payloads', async () => {
            const proposal = { toolName: 'read-log', tenantId: 'tenant-a', payload: 'rm -rf /' };
            const result = await SemanticInspector.aggregate(proposal.payload);
            
            expect(result.verdict).toBe('DENIED');
            expect(result.deterministicFailures.some(v => v.includes('rm'))).toBe(true);
        });
    });

    describe('D2: Governance Boundary Integrity', () => {
        it('Classifier Says SAFE Override Test: DENY always wins', async () => {
            const mockResponse = JSON.stringify({
                riskScore: 0.1,
                detectedIntent: 'Safe payload',
                confidence: 0.95,
                isIndeterminate: false
            });
            const chatSpy = vi.spyOn(llmService, 'chat').mockResolvedValue(mockResponse);

            // Even if the classifier says 'SAFE', a deterministic violation overrides it.
            const proposal = { toolName: 'read-log', tenantId: 'tenant-a', payload: 'DROP TABLE users' };
            const result = await SemanticInspector.aggregate(proposal.payload);
            
            expect(result.classifierEvidence?.isIndeterminate).toBe(false);
            expect(result.classifierEvidence?.riskScore).toBe(0.1);
            expect(result.verdict).toBe('DENIED');

            chatSpy.mockRestore();
        });

        it('Planner Authority Escalation Attempt: Lattice rejection', () => {
            const proposal = { toolName: 'unregistered-tool', tenantId: 'tenant-a', payload: 'run' };
            const filterRes = StaticCommandFilter.evaluateProposal(proposal);
            
            expect(filterRes).toBe(false);
        });
    });
});
