"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VFSLock = void 0;
const server_1 = require("./server");
const observability_1 = require("@packages/observability");
const LOCK_PREFIX = "vfs:lock:";
const DEFAULT_TTL_MS = 30000; // 30 seconds
/**
 * VFSLock
 *
 * A slim Redis-based advisory lock to prevent race conditions during
 * concurrent VFS snapshot/read operations on the same project.
 */
class VFSLock {
    /**
     * Acquires a lock for a project's Virtual File System.
     */
    static async acquire(projectId, ttlMs = DEFAULT_TTL_MS) {
        const lockKey = `${LOCK_PREFIX}${projectId}`;
        const lockValue = Math.random().toString(36).substring(2);
        // px: milliseconds, nx: set if not exists
        const result = await server_1.redis.set(lockKey, lockValue, "PX", ttlMs, "NX");
        if (result === "OK") {
            observability_1.logger.debug({ projectId, lockKey }, "[VFS] Advisory Lock Acquired");
            return lockValue;
        }
        return null;
    }
    /**
     * Releases a lock using a Lua script for atomic verification of the owner.
     */
    static async release(projectId, lockValue) {
        const lockKey = `${LOCK_PREFIX}${projectId}`;
        // Atomic release: only delete if the value matches (prevents releasing someone else's lock after timeout)
        const script = `
            if redis.call("get", KEYS[1]) == ARGV[1] then
                return redis.call("del", KEYS[1])
            else
                return 0
            end
        `;
        const result = await server_1.redis.eval(script, 1, lockKey, lockValue);
        if (result === 1) {
            observability_1.logger.debug({ projectId, lockKey }, "[VFS] Advisory Lock Released");
            return true;
        }
        return false;
    }
}
exports.VFSLock = VFSLock;
//# sourceMappingURL=vfs-lock.js.map