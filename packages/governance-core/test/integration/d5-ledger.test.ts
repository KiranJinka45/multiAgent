import { describe, it, expect, beforeEach } from 'vitest';
import { GovernanceLedger } from '../../src/ledger/ledger.js';
import { SemanticInspector } from '../../src/inspection/semantic-pipeline.js';
import { StaticCommandFilter } from '../../src/filters/command-filter.js';

describe('Phase D5: Governance Ledger Truthfulness', () => {
    beforeEach(() => {
        GovernanceLedger.clearForTesting();
    });

    it('Sensitive Data Leakage Audit: should redact sensitive details such as prompt, raw, payload, or credential', () => {
        const tenantId = 'tenant-xyz';
        const evidenceHash = 'hash-abc-123';
        const rawDetails = {
            prompt: 'Explain quantum physics',
            payload: 'rm -rf /',
            credential: 'supersecretpassword123',
            raw: 'dangerous input data',
            someMetadata: 'safe metadata string',
            nodeId: 42
        };

        GovernanceLedger.append('PROPOSAL_RECEIVED', tenantId, evidenceHash, rawDetails);

        const entries = GovernanceLedger.getEntries();
        expect(entries.length).toBe(1);

        const entry = entries[0];
        // Ensure sensitive fields are stripped
        expect(entry.details.prompt).toBeUndefined();
        expect(entry.details.payload).toBeUndefined();
        expect(entry.details.credential).toBeUndefined();
        expect(entry.details.raw).toBeUndefined();

        // Ensure safe fields remain
        expect(entry.details.someMetadata).toBe('safe metadata string');
        expect(entry.details.nodeId).toBe(42);
        expect(entry.tenantId).toBe(tenantId);
        expect(entry.evidenceHash).toBe(evidenceHash);
    });

    it('Attestation Consistency: should record matching deterministic evidence in ledger for denied execution', async () => {
        const proposal = { toolName: 'read-log', tenantId: 'tenant-a', payload: 'rm -rf /' };
        
        const filterPassed = StaticCommandFilter.evaluateProposal(proposal);
        if (!filterPassed) {
            GovernanceLedger.append('LATTICE_DENIED', proposal.tenantId, 'hash-err-lattice', {
                toolName: proposal.toolName,
                reason: 'Lattice check failed: unregistered tool'
            });
        }

        const inspectRes = await SemanticInspector.aggregate(proposal.payload);
        if (inspectRes.verdict === 'DENIED') {
            GovernanceLedger.append('INSPECTION_FAILED', proposal.tenantId, 'hash-err-inspect', {
                toolName: proposal.toolName,
                violations: inspectRes.deterministicFailures.join(', ')
            });
        }

        const entries = GovernanceLedger.getEntries();
        expect(entries.length).toBeGreaterThanOrEqual(1);

        const inspectEntry = entries.find(e => e.evidenceHash === 'hash-err-inspect');
        expect(inspectEntry).toBeDefined();
        expect(inspectEntry?.details.violations).toContain('rm');
        expect(inspectEntry?.evidenceHash).toBe('hash-err-inspect');
    });

    it('Rolling Hash Chain: entryId should match rolling hash and validateChainIntegrity should pass', () => {
        GovernanceLedger.append('PROPOSAL_RECEIVED', 'tenant-a', 'hash-1', { info: 'first' });
        GovernanceLedger.append('EXECUTION_STARTED', 'tenant-a', 'hash-2', { info: 'second' });

        const entries = GovernanceLedger.getEntries();
        expect(entries.length).toBe(2);

        expect(entries[0].entryId).toMatch(/^gL-[a-f0-9]{64}$/);
        expect(entries[1].entryId).toMatch(/^gL-[a-f0-9]{64}$/);
        expect(entries[1].previousHash).toBe(entries[0].entryId.replace('gL-', ''));

        expect(GovernanceLedger.validateChainIntegrity()).toBe(true);
    });
});
