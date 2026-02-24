import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DistributedExecutionContext } from '../lib/execution-context';
import redis from '../lib/redis';
import { v4 as uuidv4 } from 'uuid';

describe('DistributedExecutionContext - Redis Optimistic Locking Stress Test', () => {

    beforeAll(async () => {
        // Wait for Redis to be ready if it isn't already
        if (redis.status !== 'ready') {
            await new Promise(resolve => redis.on('ready', resolve));
        }
    });

    afterAll(async () => {
        // Ensure graceful shutdown of the Redis connection
        await redis.quit();
    });

    it('should safely handle 20 concurrent updates to the same execution context without data loss', async () => {
        const executionId = uuidv4();
        const context = new DistributedExecutionContext(executionId);

        // Initialize the base context
        await context.init('user-test', 'project-test', 'Stress test prompt', 'corr-1');

        const concurrentWorkers = 20;

        // Simulate 20 concurrent workers completing their respective agent tasks
        const updates = Array.from({ length: concurrentWorkers }).map(async (_, index) => {
            const agentName = `StressAgent_${index}`;
            try {
                // This triggers atomicUpdate (WATCH/MULTI/EXEC) internally
                await context.setAgentResult(agentName, { status: 'completed' });
            } catch (error) {
                console.error(`Update failed for ${agentName}:`, error);
                throw error;
            }
        });

        // Fire all updates simultaneously to simulate severe race conditions
        const results = await Promise.allSettled(updates);

        // Analyze failures
        const failures = results.filter(r => r.status === 'rejected');
        if (failures.length > 0) {
            console.error('Stress Test Failures:', failures);
        }

        // Verify that no updates threw errors (exceeded max retries)
        expect(failures.length).toBe(0);

        // Verify Data Integrity
        const finalContext = await context.get();
        expect(finalContext).toBeDefined();

        // All 20 agents should be present in the final state
        expect(Object.keys(finalContext!.agentResults).length).toBe(concurrentWorkers);

        for (let i = 0; i < concurrentWorkers; i++) {
            const agentName = `StressAgent_${i}`;
            expect(finalContext!.agentResults[agentName]).toBeDefined();
            expect(finalContext!.agentResults[agentName].status).toBe('completed');
        }
    }, 15000); // 15 second timeout for the 20 concurrent operations and retries

    it('should handle conflict retry and detect transaction rollback', async () => {
        const executionId = uuidv4();
        const context = new DistributedExecutionContext(executionId);
        await context.init('user-1', 'proj-1', 'Conflict test', 'corr-1');

        const key = `execution:${executionId}`;

        // Create a secondary isolated client to inject conflicts
        const conflictClient = redis.duplicate();

        try {
            // We'll wrap atomicUpdate in a Promise and simultaneously fire a direct redis write
            // to invalidate the WATCH condition

            // Promise 1: The normal atomicUpdate via context (will be watched)
            const updatePromise = context.updateStage('simulated_conflict_stage').catch(e => {
                console.error("atomicUpdate failed permanently:", e);
                throw e;
            });

            // Promise 2: A direct write to the same key to cause a WATCH failure mid-flight
            const currentData = await conflictClient.get(key);
            if (currentData) {
                const parsed = JSON.parse(currentData);
                parsed.metadata = { injected: true };
                await conflictClient.set(key, JSON.stringify(parsed));
            }

            // Await the context update. It should automatically retry reading the new state 
            // and apply 'simulated_conflict_stage' on top of our injected metadata.
            await updatePromise;

            const finalData = await context.get();
            expect(finalData).toBeDefined();

            // The stage update must have succeeded
            expect(finalData!.currentStage).toBe('simulated_conflict_stage');
            // The injected metadata should not have been overwritten (it read the new state)
            expect(finalData!.metadata.injected).toBe(true);

        } finally {
            await conflictClient.quit();
        }
    });

    it('should maintain TTL correctly during active execution', async () => {
        const executionId = uuidv4();
        const context = new DistributedExecutionContext(executionId);

        await context.init('user-1', 'proj-1', 'TTL validation test', 'corr-1');

        const key = `execution:${executionId}`;
        const initialTtl = await redis.ttl(key);

        // Expiry should be roughly 86400 (24 hours) as defined in DistributedExecutionContext.TTL
        expect(initialTtl).toBeGreaterThan(80000);
        expect(initialTtl).toBeLessThanOrEqual(86400);

        // Perform an update
        await context.updateStage('ttl_refresh_check');

        // The TTL must act as a rolling expiry and be reset to 24h
        const postUpdateTtl = await redis.ttl(key);
        expect(postUpdateTtl).toBeGreaterThan(80000);
        expect(postUpdateTtl).toBeLessThanOrEqual(86400);

        // Ensure data is still there
        const data = await context.get();
        expect(data).not.toBeNull();
    });
});
