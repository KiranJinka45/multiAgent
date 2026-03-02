/**
 * distributedLock.ts
 *
 * Phase 3 — Redis-based distributed lock (Redlock-lite).
 *
 * Prevents two worker nodes from starting the same project runtime
 * simultaneously. Uses Redis SET NX with TTL as a simple but effective
 * distributed mutex.
 *
 * For production with multiple Redis instances, use the full Redlock algorithm.
 * This single-instance version is safe for single-master Redis setups.
 */

import redis from '@/lib/redis';
import logger from '@/lib/logger';

const LOCK_PREFIX = 'cluster:lock:';
const DEFAULT_TTL_MS = 30_000;  // 30-second lock timeout

export interface LockHandle {
    key: string;
    token: string;
    acquiredAt: number;
}

export const DistributedLock = {
    /**
     * Acquire a lock for a given resource.
     * Returns a LockHandle if successful, null if the lock is already held.
     *
     * @param resource - e.g. "runtime:start:{projectId}"
     * @param ttlMs - lock auto-expires after this duration (safety valve)
     */
    async acquire(resource: string, ttlMs: number = DEFAULT_TTL_MS): Promise<LockHandle | null> {
        const key = `${LOCK_PREFIX}${resource}`;
        const token = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

        // SET key token NX PX ttlMs
        const result = await redis.set(key, token, 'PX', ttlMs, 'NX');

        if (result === 'OK') {
            logger.debug({ resource, token }, '[DistributedLock] Lock acquired');
            return { key, token, acquiredAt: Date.now() };
        }

        logger.debug({ resource }, '[DistributedLock] Lock already held');
        return null;
    },

    /**
     * Release a lock. Uses a Lua script for atomic compare-and-delete
     * so only the holder can release.
     */
    async release(handle: LockHandle): Promise<boolean> {
        // Lua script: only delete if the token matches (prevents accidental release)
        const script = `
            if redis.call("get", KEYS[1]) == ARGV[1] then
                return redis.call("del", KEYS[1])
            else
                return 0
            end
        `;

        const result = await redis.eval(script, 1, handle.key, handle.token);

        if (result === 1) {
            logger.debug({ key: handle.key }, '[DistributedLock] Lock released');
            return true;
        }

        logger.warn({ key: handle.key }, '[DistributedLock] Lock already expired or held by another');
        return false;
    },

    /**
     * Extend a lock's TTL (for long-running operations).
     * Only succeeds if we still hold the lock.
     */
    async extend(handle: LockHandle, ttlMs: number = DEFAULT_TTL_MS): Promise<boolean> {
        const script = `
            if redis.call("get", KEYS[1]) == ARGV[1] then
                return redis.call("pexpire", KEYS[1], ARGV[2])
            else
                return 0
            end
        `;

        const result = await redis.eval(script, 1, handle.key, handle.token, ttlMs.toString());

        if (result === 1) {
            logger.debug({ key: handle.key, ttlMs }, '[DistributedLock] Lock extended');
            return true;
        }

        return false;
    },

    /**
     * Execute a function while holding a lock.
     * Auto-acquires and releases. Retries up to maxRetries with backoff.
     */
    async withLock<T>(
        resource: string,
        fn: () => Promise<T>,
        options: { ttlMs?: number; maxRetries?: number; retryDelayMs?: number } = {}
    ): Promise<T> {
        const { ttlMs = DEFAULT_TTL_MS, maxRetries = 5, retryDelayMs = 1000 } = options;

        let handle: LockHandle | null = null;
        let attempt = 0;

        while (attempt < maxRetries) {
            handle = await this.acquire(resource, ttlMs);
            if (handle) break;

            attempt++;
            if (attempt < maxRetries) {
                const delay = retryDelayMs * (1 + Math.random());  // Jitter
                await new Promise(r => setTimeout(r, delay));
            }
        }

        if (!handle) {
            throw new Error(`[DistributedLock] Failed to acquire lock "${resource}" after ${maxRetries} retries`);
        }

        try {
            return await fn();
        } finally {
            await this.release(handle);
        }
    },

    /**
     * Check if a lock is currently held (for diagnostics only).
     */
    async isLocked(resource: string): Promise<boolean> {
        const key = `${LOCK_PREFIX}${resource}`;
        const exists = await redis.exists(key);
        return exists === 1;
    },
};
