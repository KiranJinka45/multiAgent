import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

vi.mock('@temporalio/workflow', () => {
    return {
        defineSignal: () => 'mock-signal',
        setHandler: () => {},
        condition: async (fn: any, timeout: number) => {
            const start = Date.now();
            while (!fn() && Date.now() - start < timeout) {
                await new Promise(r => setTimeout(r, 10));
            }
            return fn();
        }
    };
});

vi.mock('@temporalio/client', () => {
    return {
        Connection: {
            connect: async () => {
                throw new Error('No real Temporal connection in tests');
            }
        },
        Client: class {}
    };
});

import { TemporalWorkflowOrchestrator } from './temporal-workflow.js';

describe('Human Escalation Workflow', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should default to timeout cancellation', async () => {
        const timeoutMs = 1000;
        const workflowId = await TemporalWorkflowOrchestrator.startEscalationWorkflow({
            toolName: 'dangerous-tool',
            tenantId: 'tenant-1',
            payload: 'run'
        }, timeoutMs);

        expect(TemporalWorkflowOrchestrator.getStatus(workflowId)).toBe('PENDING');

        // Advance timers past the timeout
        vi.advanceTimersByTime(timeoutMs + 100);

        expect(TemporalWorkflowOrchestrator.getStatus(workflowId)).toBe('CANCELLED_TIMEOUT');
    });

    it('should allow explicit approval before timeout', async () => {
        const workflowId = await TemporalWorkflowOrchestrator.startEscalationWorkflow({
            toolName: 'dangerous-tool',
            tenantId: 'tenant-1',
            payload: 'run'
        });

        await TemporalWorkflowOrchestrator.submitDecision(workflowId, 'APPROVE');
        expect(TemporalWorkflowOrchestrator.getStatus(workflowId)).toBe('APPROVED');
    });
});
