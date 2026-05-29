import { OPAGovernanceLayer } from './policy-enforcer.js';
import { describe, it, expect } from 'vitest';

describe('OPA Governance Layer', () => {
    it('should explicitly fail-closed and deny execution when unavailable', async () => {
        OPAGovernanceLayer.setAvailability(false);
        const result = await OPAGovernanceLayer.evaluateProposal({
            toolName: 'safe-tool',
            tenantId: 'tenant-1',
            payload: 'run'
        });
        
        expect(result.isAllowed).toBe(false);
        expect(result.reason).toContain('FAIL_CLOSED');
    });

    it('should fail-closed when INTERNAL_SERVICE_TOKEN is not configured', async () => {
        // Without INTERNAL_SERVICE_TOKEN, the enforcer must deny even if OPA is available
        const originalToken = process.env.INTERNAL_SERVICE_TOKEN;
        delete process.env.INTERNAL_SERVICE_TOKEN;

        OPAGovernanceLayer.setAvailability(true);
        const result = await OPAGovernanceLayer.evaluateProposal({
            toolName: 'safe-tool',
            tenantId: 'tenant-1',
            payload: 'run'
        });
        
        expect(result.isAllowed).toBe(false);
        expect(result.reason).toContain('FAIL_CLOSED');
        expect(result.reason).toContain('INTERNAL_SERVICE_TOKEN');

        // Restore
        if (originalToken) {
            process.env.INTERNAL_SERVICE_TOKEN = originalToken;
        }
    });

    it('should fail-closed when OPA server is unreachable (network error)', async () => {
        // Set a valid token to pass the token check, but OPA won't be running
        const originalToken = process.env.INTERNAL_SERVICE_TOKEN;
        process.env.INTERNAL_SERVICE_TOKEN = 'test-token-for-opa-reachability';

        OPAGovernanceLayer.setAvailability(true);
        const result = await OPAGovernanceLayer.evaluateProposal({
            toolName: 'safe-tool',
            tenantId: 'tenant-1',
            payload: 'run'
        });
        
        // OPA is not actually running in test, so this should fail-closed on network error
        expect(result.isAllowed).toBe(false);
        expect(result.reason).toContain('FAIL_CLOSED');

        // Restore
        if (originalToken) {
            process.env.INTERNAL_SERVICE_TOKEN = originalToken;
        } else {
            delete process.env.INTERNAL_SERVICE_TOKEN;
        }
    });
});
