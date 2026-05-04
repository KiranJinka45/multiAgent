/**
 * VFSLock
 *
 * A slim Redis-based advisory lock to prevent race conditions during
 * concurrent VFS snapshot/read operations on the same project.
 */
export declare class VFSLock {
    /**
     * Acquires a lock for a project's Virtual File System.
     */
    static acquire(projectId: string, ttlMs?: number): Promise<string | null>;
    /**
     * Releases a lock using a Lua script for atomic verification of the owner.
     */
    static release(projectId: string, lockValue: string): Promise<boolean>;
}
//# sourceMappingURL=vfs-lock.d.ts.map