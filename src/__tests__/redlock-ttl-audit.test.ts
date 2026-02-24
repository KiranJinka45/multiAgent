import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import redlock from '../lib/lock';
import redis from '../lib/redis';
import { v4 as uuidv4 } from 'uuid';

describe('Redlock TTL Expiry and Auto-Extension Audit', () => {

    beforeAll(async () => {
        if (redis.status !== 'ready') {
            await new Promise(resolve => redis.on('ready', resolve));
        }
    });

    afterAll(async () => {
        await redis.quit();
    });

    it('should successfully extend a lock during a long-running execution (e.g. 90-second LLM call)', async () => {
        const executionId = uuidv4();
        const resource = `locks:execution:ttl-audit:${executionId}`;

        // Initial TTL: 2 seconds
        const lock = await redlock.acquire([resource], 2000);

        // Simulate LLM Call starting... (Takes 3000ms normally)
        await new Promise(resolve => setTimeout(resolve, 1000));

        // After 1 sec, the worker realizes it needs more time, extends the lock by 3 seconds
        const extendedLock = await lock.extend(3000);

        // Finish the rest of the 2000ms execution
        await new Promise(resolve => setTimeout(resolve, 1500));

        // If extension failed, this would allow another worker to steal it.
        // Let's verify no other worker can take it right now.
        let stolen = false;
        try {
            await redlock.acquire([resource], 1000);
            stolen = true;
        } catch (err) {
            // Expected ResourceLockedError because our extension held strong.
        }

        expect(stolen).toBe(false);
        await extendedLock.release();
    });

    it('should protect against mutual exclusion overlap during severe CPU pause / GC Stalls', async () => {
        const executionId = uuidv4();
        const resource = `locks:execution:gc-stall-audit:${executionId}`;

        // Initial tight TTL: 3 seconds
        const lock = await redlock.acquire([resource], 3000);

        // SIMULATE NODE.JS EVENT LOOP STALL (e.g., Heavy synchronous JSON payload parsing)
        // We do a busy wait to block the main thread for 4000ms.
        // During this time, standard async extend/heartbeat timers CANNOT fire.
        const start = Date.now();
        while (Date.now() - start < 4000) {
            // Blocking the CPU explicitly! Node.js event loop is completely frozen here.
        }

        // By the time the event loop unfreezes, the 3000ms TTL has naturally expired in Redis.

        // Worker 2 (Orchestrator Retry) comes in and successfully "steals" the lock because it's genuinely expired.
        const lock2 = await redlock.acquire([resource], 5000);
        expect(lock2).toBeDefined();

        // Worker 1 finally unfreezes from its GC stall and tries to release or update state thinking it still owns it.
        // It SHOULD throw an error because it lost the lock, preventing unsafe overrides!
        let releaseFailedSafely = false;
        try {
            await lock.release();
        } catch (err: any) {
            // Redlock correctly detects that the UUID value in Redis doesn't match Worker 1's lock anymore.
            if (err.name === 'ExecutionError' || err.message?.includes('locked')) {
                releaseFailedSafely = true;
            }
        }

        expect(releaseFailedSafely).toBe(true); // Worker 1 was safely blocked from catastrophic data corruption.

        await lock2.release(); // Clean up
    }, 10000);

});
