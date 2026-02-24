import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { Orchestrator } from '../agents/orchestrator';
import { DistributedExecutionContext } from '../lib/execution-context';
import redis from '../lib/redis';
import { v4 as uuidv4 } from 'uuid';

describe('Fault Tolerance - Orchestrator Crash Simulation & Resume', () => {

    beforeAll(async () => {
        if (redis.status !== 'ready') {
            await new Promise(resolve => redis.on('ready', resolve));
        }
    });

    afterAll(async () => {
        await redis.quit();
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should safely resume mid-execution after a simulated crash without duplicate operations', async () => {
        const executionId = uuidv4();
        const orchestrator = new Orchestrator();

        // 1. Mock Agents
        const dbSpy = vi.spyOn(orchestrator['dbAgent'], 'execute').mockResolvedValue({ success: true, data: { schema: 'mocked db schema' } });

        let backendCrashing = true;
        const beSpy = vi.spyOn(orchestrator['beAgent'], 'execute').mockImplementation(async () => {
            if (backendCrashing) {
                throw new Error('SIMULATED_FATAL_CRASH: Worker process died unexpectedly during BackendGeneration');
            }
            return { success: true, data: { files: [] } };
        });

        const feSpy = vi.spyOn(orchestrator['feAgent'], 'execute').mockResolvedValue({ success: true, data: { files: [] } });
        const dpSpy = vi.spyOn(orchestrator['dpAgent'], 'execute').mockResolvedValue({ success: true, data: { files: [] } });
        const teSpy = vi.spyOn(orchestrator['teAgent'], 'execute').mockResolvedValue({ success: true, data: { files: [] } });
        const valSpy = vi.spyOn(orchestrator['valAgent'], 'execute').mockResolvedValue({ success: true, data: { confidenceScore: 0.95 } });

        // Mock Stripe Billing verification (Simulating API Route boundary wrapper)
        let stripeCharges = 0;
        const mockStripeCharge = async (execId: string) => {
            const ctx = new DistributedExecutionContext(execId);
            const state = await ctx.get();
            if (state && state.paymentStatus === 'verified') {
                return; // Idempotent skip
            }

            stripeCharges++;
            if (stripeCharges > 1) {
                throw new Error('DUPLICATE_BILLING_ERROR: Stripe was charged twice!');
            }

            // Mark payment as verified
            await ctx.init('u1', 'p1', 'test', execId);
            await ctx.update({ paymentStatus: 'verified' });
        };

        // --- FIRST PASS: INITIAL EXECUTION (WILL CRASH) ---

        // 1. API Route: Verify billing and create context
        await mockStripeCharge(executionId);

        // 2. Worker 1 Picks up job and runs
        const result1 = await orchestrator.run('Resume Test', 'u1', 'p1', executionId);

        // Assertions for First Pass
        expect(result1.success).toBe(false);
        expect(result1.error).toContain('SIMULATED_FATAL_CRASH'); // The retry manager will bubble this up after attempts

        expect(stripeCharges).toBe(1); // Billed once
        expect(dbSpy).toHaveBeenCalledTimes(1); // DB Agent successfully generated
        // Backend Agent attempted to run (and failed)
        expect(beSpy).toHaveBeenCalled();

        // Critical: Dependency agents must NOT have executed because it crashed in parallel step
        expect(dpSpy).toHaveBeenCalledTimes(0);

        // --- SECOND PASS: RESUME EXECUTION (NEW WORKER) ---

        // Fix the backend mock so the new worker succeeds
        backendCrashing = false;

        // 1. API Route check (If webhook fires again or user retries)
        await mockStripeCharge(executionId);
        expect(stripeCharges).toBe(1); // IDEMPOTENCY check passed: NO DUPLICATE BILLING

        // 2. Worker 2 Resumes Orchestrator using the EXACT SAME executionId
        const result2 = await orchestrator.run('Resume Test', 'u1', 'p1', executionId);

        // Assertions for Second Pass
        expect(result2.success).toBe(true);
        expect(result2.context?.status).toBe('completed');

        // Crucial Resumability Checks:
        // dbSpy should STILL only be 1. It skipped it because it was marked 'completed' in Redis!
        expect(dbSpy).toHaveBeenCalledTimes(1);

        // dpSpy should be called exactly once now
        expect(dpSpy).toHaveBeenCalledTimes(1);

        // Everything finalized perfectly
        const finalData = await new DistributedExecutionContext(executionId).get();
        expect(finalData?.agentResults['DatabaseAgent'].status).toBe('completed');
        expect(finalData?.agentResults['DeploymentAgent'].status).toBe('completed');
    }, 20000);
});
