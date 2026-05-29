import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OPAGovernanceLayer } from '../../src/opa/policy-enforcer.js';
import { TemporalWorkflowOrchestrator } from '../../src/escalation/temporal-workflow.js';
import { GovernanceLedger } from '../../src/ledger/ledger.js';

// Telemetry Validator with Quarantine & Indeterminate logic
class TelemetryValidator {
    static validateTelemetry(telemetry: { hash: string; timestamp: number; prevTimestamp: number }): 'PASS' | 'QUARANTINE_INDETERMINATE' {
        // Telemetry Corruption detection: hash must be non-empty and length 64 (sha256)
        if (!telemetry.hash || telemetry.hash.length !== 64) {
            return 'QUARANTINE_INDETERMINATE';
        }

        // Reverted Timestamps check: timestamp cannot go backwards
        if (telemetry.timestamp < telemetry.prevTimestamp) {
            return 'QUARANTINE_INDETERMINATE';
        }

        return 'PASS';
    }
}

describe('Phase D6: Adversarial Reliability Campaigns', () => {
    let originalToken: string | undefined;

    beforeEach(() => {
        GovernanceLedger.clearForTesting();
        OPAGovernanceLayer.setAvailability(true);
        originalToken = process.env.INTERNAL_SERVICE_TOKEN;
        process.env.INTERNAL_SERVICE_TOKEN = 'test-token';
        vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => {
            return {
                ok: true,
                json: async () => ({ result: { allow: true } })
            };
        }));
    });

    afterEach(() => {
        process.env.INTERNAL_SERVICE_TOKEN = originalToken;
        vi.unstubAllGlobals();
    });

    it('Telemetry Corruption: should quarantine and return INDETERMINATE when hashes are corrupted or timestamps revert', () => {
        const corruptedTelemetry = {
            hash: 'corrupted-short-hash',
            timestamp: Date.now(),
            prevTimestamp: Date.now() - 1000
        };

        const result1 = TelemetryValidator.validateTelemetry(corruptedTelemetry);
        expect(result1).toBe('QUARANTINE_INDETERMINATE');
        if (result1 === 'QUARANTINE_INDETERMINATE') {
            GovernanceLedger.append('ISOLATION_FAULT', 'tenant-a', 'hash-corrupt', {
                issue: 'Telemetry hash corrupted'
            });
        }

        const revertedTelemetry = {
            hash: 'a'.repeat(64),
            timestamp: Date.now() - 5000, // Reverted in time
            prevTimestamp: Date.now()
        };

        const result2 = TelemetryValidator.validateTelemetry(revertedTelemetry);
        expect(result2).toBe('QUARANTINE_INDETERMINATE');
        if (result2 === 'QUARANTINE_INDETERMINATE') {
            GovernanceLedger.append('ISOLATION_FAULT', 'tenant-a', 'hash-reverted', {
                issue: 'Telemetry timestamp reverted'
            });
        }

        const entries = GovernanceLedger.getEntries().filter(e => e.eventType === 'ISOLATION_FAULT');
        expect(entries.length).toBeGreaterThanOrEqual(2);
        expect(entries[0].eventType).toBe('ISOLATION_FAULT');
        expect(entries[1].eventType).toBe('ISOLATION_FAULT');
    });

    it('OPA Unavailability Mid-Campaign: should fail-closed and reject execution proposals when OPA crashes', async () => {
        const proposal = { toolName: 'read-log', tenantId: 'tenant-a', payload: 'run' };

        // Pre-condition: OPA is available and allows proposal
        const initialRes = await OPAGovernanceLayer.evaluateProposal(proposal);
        expect(initialRes.isAllowed).toBe(true);

        // OPA crashes/goes offline mid-execution
        OPAGovernanceLayer.setAvailability(false);

        // Post-condition: OPA is unavailable, execution must fail-closed (denied)
        const postCrashRes = await OPAGovernanceLayer.evaluateProposal(proposal);
        expect(postCrashRes.isAllowed).toBe(false);
        expect(postCrashRes.reason).toContain('FAIL_CLOSED');
    });

    it('Timeout Storms: delayed Temporal workflows should default to cancellation and zero auto-approval', async () => {
        const proposal = { toolName: 'write-log', tenantId: 'tenant-b', payload: 'run' };

        // Start workflow with a short timeout to simulate a delay/timeout storm
        const workflowId = await TemporalWorkflowOrchestrator.startEscalationWorkflow(proposal, 10);

        // Verify status starts as PENDING
        expect(TemporalWorkflowOrchestrator.getStatus(workflowId)).toBe('PENDING');

        // Wait for the timeout to trigger default-deny/cancellation
        await new Promise((resolve) => setTimeout(resolve, 30));

        // State must transition to CANCELLED_TIMEOUT (default-deny) rather than auto-approving
        expect(TemporalWorkflowOrchestrator.getStatus(workflowId)).toBe('CANCELLED_TIMEOUT');
    });
});
