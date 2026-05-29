import { describe, it, expect } from 'vitest';
import { GovernanceLedger } from '../../src/ledger/ledger.js';
import { TemporalWorkflowOrchestrator } from '../../src/escalation/temporal-workflow.js';

class LeaseHeartbeatTracker {
    private leaseExpiresAt = 0;
    
    extendLease(durationMs: number, currentTime: number): void {
        this.leaseExpiresAt = currentTime + durationMs;
    }

    isFenced(currentTime: number): boolean {
        return currentTime > this.leaseExpiresAt;
    }
}

describe('Phase H1: Long-Duration Soak & State Durability Tests', () => {
    it('should compact older ledger entries while preserving rolling hash causal integrity', () => {
        GovernanceLedger.clearForTesting();

        const initialHash = GovernanceLedger.getRollingHash();

        // Append 150 entries
        for (let i = 0; i < 150; i++) {
            GovernanceLedger.append('PROPOSAL_RECEIVED', 'tenant-h', 'hash-h', { index: i });
        }

        const preCompactedHash = GovernanceLedger.getRollingHash();
        expect(preCompactedHash).not.toBe(initialHash);
        expect(GovernanceLedger.getEntries().length).toBe(150);

        // Compact to keep only the last 100 entries
        GovernanceLedger.compact(100);

        expect(GovernanceLedger.getEntries().length).toBe(100);
        expect(GovernanceLedger.getCompactedCount()).toBe(50);
        // The rolling cryptographic hash MUST remain identical to preserve lineage validation
        expect(GovernanceLedger.getRollingHash()).toBe(preCompactedHash);
    });

    it('should serialize and deserialize Temporal workflow states supporting durable recovery', async () => {
        TemporalWorkflowOrchestrator.clearWorkflows();

        const proposal = { toolName: 'read-log', tenantId: 'tenant-h', payload: 'run' };
        const wfId = await TemporalWorkflowOrchestrator.startEscalationWorkflow(proposal, 5000);

        const initialStatus = TemporalWorkflowOrchestrator.getStatus(wfId);
        expect(initialStatus).toBe('PENDING');

        // Serialize state to string
        const serialized = TemporalWorkflowOrchestrator.serialize();

        // Clear active memory workflows
        TemporalWorkflowOrchestrator.clearWorkflows();
        expect(TemporalWorkflowOrchestrator.getStatus(wfId)).toBeUndefined();

        // Restore state from serialized string
        TemporalWorkflowOrchestrator.deserialize(serialized);
        expect(TemporalWorkflowOrchestrator.getStatus(wfId)).toBe('PENDING');
    });

    it('should fence execution when VM heartbeat lease extensions fail', () => {
        const tracker = new LeaseHeartbeatTracker();
        const baseTime = Date.now();

        // Extend lease by 10 seconds
        tracker.extendLease(10000, baseTime);
        expect(tracker.isFenced(baseTime + 5000)).toBe(false);

        // Bypassed heartbeat: advance past lease period without extension -> fenced
        expect(tracker.isFenced(baseTime + 12000)).toBe(true);

        // Healthy heartbeat renewal: extend lease again
        tracker.extendLease(10000, baseTime + 8000);
        expect(tracker.isFenced(baseTime + 12000)).toBe(false);
    });
});
