

/**
 * runtimeCapacity.ts
 *
 * Phase 1 — Feature 3: Max Concurrent Runtime Guard
 *
 * Enforces:
 *  - System-wide max concurrent running previews
 *  - Per-user runtime quota
 *  - Queue position tracking when capacity is reached
 *
 * Uses Redis atomic counters so this is safe across multiple worker instances.
 * No process logic. No port logic. No URL logic.
 */

import { redis } from '@packages/utils';
import { logger } from '@packages/observability';

// ─── Config ────────────────────────────────────────────────────────────────

const SYSTEM_MAX_CONCURRENT = parseInt(process.env.RUNTIME_MAX_CONCURRENT ?? '50', 10);
const USER_MAX_CONCURRENT = parseInt(process.env.RUNTIME_USER_MAX_CONCURRENT ?? '3', 10);

const SYSTEM_COUNTER_KEY = 'runtime:capacity:system:running';
const USER_COUNTER_PREFIX = 'runtime:capacity:user:';
const QUEUE_KEY = 'runtime:capacity:queue';           // Redis list (LPUSH / BRPOP)
const CAPACITY_TTL = 3600;                              // Safety TTL on counters (1 hour)

export interface CapacityCheckResult {
    allowed: boolean;
    systemCount: number;
    userCount: number;
    queueDepth: number;
    reason?: string;
}

export interface QueueEntry {
    projectId: string;
    userId: string;
    executionId: string;
    enqueuedAt: string;
}

export const RuntimeCapacity = {
    /**
     * Check whether a new runtime can be started.
     * Returns `allowed: true` if both system and user quotas permit.
     * Does NOT reserve capacity — call `reserve()` after allowed check.
     */
    async check(userId: string): Promise<CapacityCheckResult> {
        const [systemRaw, userRaw, queueLen] = await Promise.all([
            redis.get(SYSTEM_COUNTER_KEY),
            redis.get(`${USER_COUNTER_PREFIX}${userId}`),
            redis.llen(QUEUE_KEY),
        ]);

        const systemCount = parseInt(systemRaw ?? '0', 10);
        const userCount = parseInt(userRaw ?? '0', 10);

        if (systemCount >= SYSTEM_MAX_CONCURRENT) {
            return {
                allowed: false, systemCount, userCount, queueDepth: queueLen,
                reason: `System capacity reached (${systemCount}/${SYSTEM_MAX_CONCURRENT})`
            };
        }

        if (userCount >= USER_MAX_CONCURRENT) {
            return {
                allowed: false, systemCount, userCount, queueDepth: queueLen,
                reason: `User quota reached (${userCount}/${USER_MAX_CONCURRENT} runtimes)`
            };
        }

        return { allowed: true, systemCount, userCount, queueDepth: queueLen };
    },

    /**
     * Atomically reserve a runtime slot for a user.
     * Uses INCR so this is race-condition safe across workers.
     *
     * Returns the new counts after reservation.
     */
    async reserve(userId: string): Promise<{ systemCount: number; userCount: number }> {
        const [systemCount, userCount] = await Promise.all([
            redis.incr(SYSTEM_COUNTER_KEY),
            redis.incr(`${USER_COUNTER_PREFIX}${userId}`),
        ]);

        // Safety TTLs — counter auto-expires if release() is never called
        await redis.expire(SYSTEM_COUNTER_KEY, CAPACITY_TTL);
        await redis.expire(`${USER_COUNTER_PREFIX}${userId}`, CAPACITY_TTL);

        logger.info({ userId, systemCount, userCount }, '[RuntimeCapacity] Slot reserved');
        return { systemCount, userCount };
    },

    /**
     * Release a runtime slot when a process stops.
     * Guards against going below 0.
     */
    async release(userId: string): Promise<void> {
        const sysRaw = await redis.get(SYSTEM_COUNTER_KEY);
        const userRaw = await redis.get(`${USER_COUNTER_PREFIX}${userId}`);

        const sysCount = parseInt(sysRaw ?? '0', 10);
        const userCount = parseInt(userRaw ?? '0', 10);

        if (sysCount > 0) await redis.decr(SYSTEM_COUNTER_KEY);
        if (userCount > 0) await redis.decr(`${USER_COUNTER_PREFIX}${userId}`);

        logger.info({ userId }, '[RuntimeCapacity] Slot released');

        // Try to dequeue next waiting runtime
        await this.dequeueNext();
    },

    /**
     * Add a project to the waiting queue when capacity is full.
     */
    async enqueue(entry: QueueEntry): Promise<number> {
        const position = await redis.lpush(QUEUE_KEY, JSON.stringify(entry));
        logger.info({ ...entry, position }, '[RuntimeCapacity] Queued for runtime slot');
        return position;
    },

    /**
     * Dequeue the next waiting project and publish it to a channel
     * so a worker can pick it up and start the runtime.
     */
    async dequeueNext(): Promise<QueueEntry | null> {
        const raw = await redis.rpop(QUEUE_KEY);
        if (!raw) return null;

        const entry: QueueEntry = JSON.parse(raw);
        logger.info({ ...entry }, '[RuntimeCapacity] Dequeued runtime request');

        // Signal the runtime system to start this dequeued project
        await redis.publish('runtime:capacity:dequeue', JSON.stringify(entry));
        return entry;
    },

    /**
     * Get current system-wide capacity snapshot.
     */
    async snapshot(): Promise<{ systemCount: number; systemMax: number; queueDepth: number }> {
        const [sysRaw, queueLen] = await Promise.all([
            redis.get(SYSTEM_COUNTER_KEY),
            redis.llen(QUEUE_KEY),
        ]);
        return {
            systemCount: parseInt(sysRaw ?? '0', 10),
            systemMax: SYSTEM_MAX_CONCURRENT,
            queueDepth: queueLen,
        };
    },

    /**
     * Force-reset all counters. Only for admin/testing.
     */
    async reset(): Promise<void> {
        await redis.del(SYSTEM_COUNTER_KEY);
        logger.warn('[RuntimeCapacity] System counter reset');
    },
};













