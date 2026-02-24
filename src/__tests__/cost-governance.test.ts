import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import redis from '../lib/redis';
import { CostGovernanceService, DEFAULT_GOVERNANCE_CONFIG } from '../lib/governance';
import { v4 as uuidv4 } from 'uuid';

describe('Cost Governance Layer Integration Tests', () => {

    beforeAll(async () => {
        if (redis.status !== 'ready') {
            await new Promise(resolve => redis.on('ready', resolve));
        }
    });

    afterAll(async () => {
        await redis.quit();
    });

    beforeEach(async () => {
        // Clear global kill switch and any test-specific keys before each test
        await redis.del('system:kill_switch');
    });

    it('should respect the global kill switch', async () => {
        // Switch off initially
        expect(await CostGovernanceService.isKillSwitchActive()).toBe(false);

        // Turn on Kill Switch
        await redis.set('system:kill_switch', 'true');
        expect(await CostGovernanceService.isKillSwitchActive()).toBe(true);
    });

    it('should track and enforce daily execution limits correctly using atomic INCR operations', async () => {
        const userId = `test-user-${uuidv4()}`;
        const limits = { maxDailyGenerations: 3, maxMonthlyTokens: 1000 };

        // 1st request
        let res = await CostGovernanceService.checkAndIncrementExecutionLimit(userId, limits);
        expect(res.allowed).toBe(true);
        expect(res.currentCount).toBe(1);

        // 2nd request
        res = await CostGovernanceService.checkAndIncrementExecutionLimit(userId, limits);
        expect(res.allowed).toBe(true);
        expect(res.currentCount).toBe(2);

        // 3rd request (Final allowed)
        res = await CostGovernanceService.checkAndIncrementExecutionLimit(userId, limits);
        expect(res.allowed).toBe(true);
        expect(res.currentCount).toBe(3);

        // 4th request (Should be BLOCKED)
        res = await CostGovernanceService.checkAndIncrementExecutionLimit(userId, limits);
        expect(res.allowed).toBe(false);
        expect(res.currentCount).toBe(3); // Count stops at the limit exactly

        // Test refunding (e.g. if Stripe payment failed later in the middleware)
        await CostGovernanceService.refundExecution(userId);

        // 4th request retry (Should be ALLOWED again because we refunded)
        res = await CostGovernanceService.checkAndIncrementExecutionLimit(userId, limits);
        expect(res.allowed).toBe(true);
        expect(res.currentCount).toBe(3);
    });

    it('should track cumulative token usage per user across multiple executions and block overages', async () => {
        const userId = `test-user-${uuidv4()}`;
        const limits = { maxDailyGenerations: 50, maxMonthlyTokens: 100000 };

        // User starts at 0
        let tokenCheck = await CostGovernanceService.checkTokenLimit(userId, limits);
        expect(tokenCheck.allowed).toBe(true);
        expect(tokenCheck.usedTokens).toBe(0);

        // Orchestrator simulates successful run and records 40,000 tokens
        await CostGovernanceService.recordTokenUsage(userId, 40000);

        tokenCheck = await CostGovernanceService.checkTokenLimit(userId, limits);
        expect(tokenCheck.allowed).toBe(true);
        expect(tokenCheck.usedTokens).toBe(40000);

        // Orchestrator records another 50,000 tokens (Total: 90,000)
        await CostGovernanceService.recordTokenUsage(userId, 50000);

        tokenCheck = await CostGovernanceService.checkTokenLimit(userId, limits);
        expect(tokenCheck.allowed).toBe(true);
        expect(tokenCheck.usedTokens).toBe(90000);

        // Orchestrator records 15,000 tokens (Total: 105,000) - Over Budget!
        await CostGovernanceService.recordTokenUsage(userId, 15000);

        // User tries a new job, should be blocked!
        tokenCheck = await CostGovernanceService.checkTokenLimit(userId, limits);
        expect(tokenCheck.allowed).toBe(false);
        expect(tokenCheck.usedTokens).toBe(105000);
    });

});
