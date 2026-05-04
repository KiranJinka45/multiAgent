/**
 * distributedLock.ts
 *
 * Simple Redis-based distributed lock for cluster-wide coordination.
 */

import { redis } from '@packages/utils';

export interface LockHandle {
    key: string;
    token: string;
}

export const DistributedLock = {
    async acquire(key: string, ttlMs: number): Promise<LockHandle | null> {
        const token = Math.random().toString(36).substring(2);
        const acquired = await redis.set(key, token, 'PX', ttlMs, 'NX');
        
        if (acquired === 'OK') {
            return { key, token };
        }
        return null;
    },

    async release(handle: LockHandle | null): Promise<boolean> {
        if (!handle) return false;
        
        // Atomic release with Lua script
        const script = `
            if redis.call("get", KEYS[1]) == ARGV[1] then
                return redis.call("del", KEYS[1])
            else
                return 0
            end
        `;
        
        const result = await redis.eval(script, 1, handle.key, handle.token);
        return result === 1;
    },

    async isLocked(key: string): Promise<boolean> {
        const val = await redis.get(key);
        return val !== null;
    }
};

