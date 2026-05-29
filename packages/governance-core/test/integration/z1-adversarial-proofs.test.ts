import { describe, it, expect, vi, beforeEach } from 'vitest';
import { projectService } from '../../../../apps/core-api/src/services/project-service.js';
import { SeccompFilterGenerator } from '../../src/isolation/seccomp.js';
import { tenantLimiter } from '../../../../packages/utils/src/middleware/tenant-limiter.js';
import { OPAGovernanceLayer } from '../../src/opa/policy-enforcer.js';
import { TemporalWorkflowOrchestrator } from '../../src/escalation/temporal-workflow.js';
import { GovernanceLedger } from '../../src/ledger/ledger.js';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// 1. Mock Prisma DB for cross-tenant tests
const { mockDb } = vi.hoisted(() => {
    return {
        mockDb: {
            projectFile: {
                findFirst: vi.fn(),
                update: vi.fn(),
            }
        }
    };
});

vi.mock('@packages/db', () => ({
    db: mockDb
}));

describe('Adversarial Verification Proofs (ZTAN)', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ────────────────────────────────────────────────────────────────────────
    // PROOF 1: CROSS-TENANT WRITES REJECTED
    // ────────────────────────────────────────────────────────────────────────
    it('should reject file updates when tenant context does not match owner', async () => {
        // Attack scenario: Tenant A tries to update a file owned by Tenant B
        // The query enforces `{ id: 'file-123', project: { tenantId: 'tenant-a' } }`
        
        // Mock findFirst returning null because the file belongs to tenant-b
        mockDb.projectFile.findFirst.mockResolvedValue(null);

        await expect(
            projectService.updateFile('file-123', 'malicious code', 'tenant-a')
        ).rejects.toThrow('Unauthorized or file not found');

        // Verify the ownership query structure prevents bypass
        expect(mockDb.projectFile.findFirst).toHaveBeenCalledWith({
            where: {
                id: 'file-123',
                project: { tenantId: 'tenant-a' }
            }
        });
        
        // Verify no update occurred
        expect(mockDb.projectFile.update).not.toHaveBeenCalled();
    });

    // ────────────────────────────────────────────────────────────────────────
    // PROOF 2: HOST EXECUTION IMPOSSIBLE (SECCOMP KILL-DEFAULT)
    // ────────────────────────────────────────────────────────────────────────
    it('should enforce default_action: kill and exclude networking from seccomp allowlist', () => {
        const profile = SeccompFilterGenerator.generateProfile();
        
        // Ensure default action is hard kill, not allow
        expect(profile.default_action).toBe('kill');
        expect(profile.filter_action).toBe('allow');

        const allowedSyscalls = profile.syscalls.map(s => s.name);

        // Required minimal operational syscalls should be allowed
        expect(allowedSyscalls).toContain('read');
        expect(allowedSyscalls).toContain('write');
        expect(allowedSyscalls).toContain('exit');

        // NETWORK ESCAPE VECTORS MUST BE BLOCKED
        // By omitting them from the allowlist, the default_action='kill' catches them
        expect(allowedSyscalls).not.toContain('socket');
        expect(allowedSyscalls).not.toContain('connect');
        expect(allowedSyscalls).not.toContain('sendto');
        expect(allowedSyscalls).not.toContain('recvfrom');
        expect(allowedSyscalls).not.toContain('bind');
        expect(allowedSyscalls).not.toContain('accept');
        expect(allowedSyscalls).not.toContain('listen');
        expect(allowedSyscalls).not.toContain('ptrace');
    });

    // ────────────────────────────────────────────────────────────────────────
    // PROOF 3: REDIS OUTAGE RETURNS 503 (FAIL-CLOSED)
    // ────────────────────────────────────────────────────────────────────────
    it('should return 503 Service Unavailable (fail-closed) during rate limiter backend outage', async () => {
        // Mock Express Req/Res
        const req: any = { 
            headers: { 'x-tenant-id': 'tenant-test' }, 
            user: { tenantId: 'tenant-test' },
            path: '/api/v1/resource' 
        };
        const res: any = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
            setHeader: vi.fn()
        };
        const next = vi.fn();

        const redisClient = (globalThis as any).__redisClient;
        const originalIncr = redisClient.incr;
        redisClient.incr = vi.fn().mockRejectedValue(new Error('Redis connection lost'));
        try {
            // Re-import with the mocked backend
            const { tenantLimiter: mockedLimiter } = await import('../../../../packages/utils/src/middleware/tenant-limiter.js');

            await mockedLimiter(req, res, next);

            expect(next).not.toHaveBeenCalled(); // DID NOT FAIL OPEN
            expect(res.status).toHaveBeenCalledWith(503);
            expect(res.json).toHaveBeenCalledWith({
                error: 'RATE_LIMIT_UNAVAILABLE',
                message: 'The governance control plane rate limiter is offline. Fail-closed security policy enforced.'
            });
        } finally {
            redisClient.incr = originalIncr;
        }
    });

    // ────────────────────────────────────────────────────────────────────────
    // PROOF 4: OPA OUTAGE DENIES REQUESTS (FAIL-CLOSED)
    // ────────────────────────────────────────────────────────────────────────
    it('should deny execution requests when OPA authorization server is unreachable', async () => {
        const originalToken = process.env.INTERNAL_SERVICE_TOKEN;
        process.env.INTERNAL_SERVICE_TOKEN = 'valid-token';
        
        OPAGovernanceLayer.setAvailability(true);
        
        // Mock global fetch to simulate network error (OPA down)
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED 127.0.0.1:8181')));

        const result = await OPAGovernanceLayer.evaluateProposal({
            toolName: 'dangerous-tool',
            tenantId: 'tenant-1',
            payload: 'run'
        });

        // Must fail closed
        expect(result.isAllowed).toBe(false);
        expect(result.reason).toContain('FAIL_CLOSED');

        vi.unstubAllGlobals();
        process.env.INTERNAL_SERVICE_TOKEN = originalToken;
    });

    // ────────────────────────────────────────────────────────────────────────
    // PROOF 5: TEMPORAL WORKFLOWS FAIL-CLOSED ON UNATTENDED TIMEOUT
    // ────────────────────────────────────────────────────────────────────────
    it('should durably default to CANCELLED_TIMEOUT (fail-closed) if no human decision is received', async () => {
        // Set short timeout to verify fail-closed behavior
        const workflowId = await TemporalWorkflowOrchestrator.startEscalationWorkflow({
            toolName: 'system-wipe',
            tenantId: 'tenant-1',
            payload: 'rm -rf /'
        }, 100); // 100ms timeout

        // Verify initial state is PENDING
        expect(TemporalWorkflowOrchestrator.getStatus(workflowId)).toBe('PENDING');

        // Wait for timeout to expire
        await new Promise(resolve => setTimeout(resolve, 150));

        // State must transition to CANCELLED_TIMEOUT, effectively rejecting the request
        expect(TemporalWorkflowOrchestrator.getStatus(workflowId)).toBe('CANCELLED_TIMEOUT');
    });

    // ────────────────────────────────────────────────────────────────────────
    // PROOF 6: LEDGER ENTRIES SURVIVE RESTART (IMMUTABLE LOGGING)
    // ────────────────────────────────────────────────────────────────────────
    it('should durably write ledger entries to disk and recover them on process restart', async () => {
        // Clear for testing to get clean state
        GovernanceLedger.clearForTesting();
        
        // Lazy-load creates genesis entries
        GovernanceLedger.getEntries();
        
        // Write entry
        const entryId = GovernanceLedger.append('PROPOSAL_RECEIVED', 'tenant-1', 'dummy-hash', { action: 'test' });
        
        // Simulate Process Crash (Reset memory state)
        (GovernanceLedger as any).entries = [];
        (GovernanceLedger as any).isLoaded = false;
        
        // Check recovery
        const recoveredEntries = GovernanceLedger.getEntries();
        expect(recoveredEntries.length).toBeGreaterThan(0);
        
        const recoveredEntry = recoveredEntries.find(e => e.entryId === entryId);
        expect(recoveredEntry).toBeDefined();
        expect(recoveredEntry?.details.action).toBe('test');
        
        // Clean up
        GovernanceLedger.clearForTesting();
    });
});
