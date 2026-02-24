import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { withLock } from '../lib/lock';
import redlock from '../lib/lock';
import redis from '../lib/redis';
import { v4 as uuidv4 } from 'uuid';

describe('Redlock Safety & Distributed Locking Integration Tests', () => {

    beforeAll(async () => {
        if (redis.status !== 'ready') {
            await new Promise(resolve => redis.on('ready', resolve));
        }
    });

    afterAll(async () => {
        await redis.quit();
    });

    it('should prevent two workers from racing for the exact same lock (Mutual Exclusion)', async () => {
        const executionId = uuidv4();
        let concurrentHolds = 0;
        let maxConcurrent = 0;
        let totalExecutions = 0;

        const workerTask = async () => {
            await withLock(executionId, async () => {
                concurrentHolds++;
                maxConcurrent = Math.max(maxConcurrent, concurrentHolds);
                await new Promise(resolve => setTimeout(resolve, 500)); // Hold lock
                concurrentHolds--;
                totalExecutions++;
            });
        };

        // Fire 3 workers at the exact same time
        const results = await Promise.allSettled([workerTask(), workerTask(), workerTask()]);

        expect(maxConcurrent).toBe(1); // Never exceeded 1 concurrent hold
        expect(totalExecutions).toBe(3); // All 3 queued up and executed sequentially based on Redlock retries

        // Assert none of the promises rejected
        expect(results.every(r => r.status === 'fulfilled')).toBe(true);
    });

    it('should simulate Lock TTL expiry during long execution and explicit extension logic', async () => {
        const executionId = uuidv4();
        const resource = `locks:execution:${executionId}`;
        const initialTtl = 2000;

        // Worker 1 acquires the lock
        const lock = await redlock.acquire([resource], initialTtl);

        // Worker 1 is doing long processing... wait 1500ms
        await new Promise(resolve => setTimeout(resolve, 1500));

        // The lock is about to expire, but Worker 1 extends it dynamically
        const extendedLock = await lock.extend(3000); // Add 3s

        // Worker 1 continues processing for 1000ms
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Worker 2 tries to acquire the lock at T=2500ms
        // If Worker 1 didn't extend it, Worker 2 would successfully steal it (because it would have expired at 2000)!
        let stolen = false;
        try {
            await redlock.acquire([resource], 1000);
            stolen = true;
        } catch (error) {
            // We expect a ResourceLockedError because Worker 1 successfully extended it
        }

        expect(stolen).toBe(false); // Lock extension was safe

        // Worker 1 finishes and releases
        await extendedLock.release();
    });

    it('should ensure no double execution occurs when verifying idempotency combined with locking', async () => {
        const executionId = uuidv4();
        let businessLogicCount = 0;

        // Shared distributed state (mocked as local object for test)
        const distributedState = { processed: false };

        const idempotentWorkerTask = async () => {
            await withLock(executionId, async () => {
                // 1. Read state
                if (distributedState.processed) {
                    return; // Already processed by whoever held the lock first
                }

                // 2. Do work
                await new Promise(resolve => setTimeout(resolve, 200));

                // 3. Update state
                distributedState.processed = true;
                businessLogicCount++;
            });
        };

        // Fire 5 concurrent workers
        await Promise.allSettled([
            idempotentWorkerTask(),
            idempotentWorkerTask(),
            idempotentWorkerTask(),
            idempotentWorkerTask(),
            idempotentWorkerTask()
        ]);

        // Only ONE worker should have done the business logic, the other 4 skipped
        expect(businessLogicCount).toBe(1);
    });

    it('should handle Redis restart or disconnect during lock hold smoothly', async () => {
        const executionId = uuidv4();
        let workerCompleted = false;

        const p = withLock(executionId, async () => {
            // While holding the lock, simulate a catastrophic network partition / Redis crash
            redis.disconnect();

            await new Promise(resolve => setTimeout(resolve, 200));

            // Reconnect simulate Redis coming back online
            await redis.connect();
            await new Promise(resolve => setTimeout(resolve, 200));

            workerCompleted = true;
        }, 5000);

        await expect(p).resolves.toBeUndefined();
        expect(workerCompleted).toBe(true);
    }, 15000);
});
