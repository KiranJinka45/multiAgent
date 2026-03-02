/**
 * runtimeEscalation.ts
 *
 * Phase 1 — Feature 2: Auto-Failure Escalation
 *
 * Tracks crash history per project and enforces escalation rules:
 *  - After N crashes in a time window → disable auto-restart
 *  - Stores failure reason history for debugging
 *  - Exposes escalation status to admin dashboard
 *
 * Uses Redis sorted sets (score = timestamp) for efficient windowed counting.
 * No process logic. No port logic.
 */

import redis from '@/lib/redis';
import logger from '@/lib/logger';

// ─── Config ────────────────────────────────────────────────────────────────

const CRASH_WINDOW_MS = 15 * 60 * 1000;  // 15-minute sliding window
const MAX_CRASHES_IN_WINDOW = 5;                // Auto-restart disabled after this
const FAILURE_HISTORY_KEY = 'runtime:failures:';
const ESCALATION_FLAG_KEY = 'runtime:escalated:';
const FAILURE_HISTORY_TTL = 86400 * 7;        // 7 days
const ESCALATION_TTL = 3600;             // Lock-out for 1 hour

export interface FailureEntry {
    timestamp: string;
    reason: string;
    pid: number | null;
    port: number | null;
    crashIndex: number;    // Nth crash in this window
}

export interface EscalationStatus {
    projectId: string;
    isEscalated: boolean;
    crashesInWindow: number;
    threshold: number;
    windowMs: number;
    cooldownRemainingMs: number;
    recentFailures: FailureEntry[];
}

export const RuntimeEscalation = {
    /**
     * Record a crash event. Returns whether auto-restart is still allowed.
     *
     * Flow:
     *  1. Add crash to sorted set (score = timestamp)
     *  2. Trim entries older than the window
     *  3. Count remaining entries
     *  4. If count >= threshold → set escalation flag, return false
     *  5. Otherwise → return true (restart allowed)
     */
    async recordCrash(
        projectId: string,
        reason: string,
        pid: number | null = null,
        port: number | null = null
    ): Promise<{ restartAllowed: boolean; crashCount: number }> {
        const now = Date.now();
        const historyKey = `${FAILURE_HISTORY_KEY}${projectId}`;

        // 1. Add crash event
        const entry: FailureEntry = {
            timestamp: new Date(now).toISOString(),
            reason,
            pid,
            port,
            crashIndex: 0, // Will be set after counting
        };
        await redis.zadd(historyKey, now, JSON.stringify(entry));
        await redis.expire(historyKey, FAILURE_HISTORY_TTL);

        // 2. Remove events outside the sliding window
        const windowStart = now - CRASH_WINDOW_MS;
        await redis.zremrangebyscore(historyKey, '-inf', windowStart);

        // 3. Count crashes in window
        const crashCount = await redis.zcard(historyKey);

        // 4. Check threshold
        if (crashCount >= MAX_CRASHES_IN_WINDOW) {
            await this.escalate(projectId);
            logger.error(
                { projectId, crashCount, threshold: MAX_CRASHES_IN_WINDOW },
                '[Escalation] Threshold breached — auto-restart DISABLED'
            );
            return { restartAllowed: false, crashCount };
        }

        logger.warn(
            { projectId, crashCount, threshold: MAX_CRASHES_IN_WINDOW },
            '[Escalation] Crash recorded — auto-restart still allowed'
        );
        return { restartAllowed: true, crashCount };
    },

    /**
     * Set the escalation flag — disables auto-restart for ESCALATION_TTL.
     */
    async escalate(projectId: string): Promise<void> {
        await redis.setex(
            `${ESCALATION_FLAG_KEY}${projectId}`,
            ESCALATION_TTL,
            JSON.stringify({
                escalatedAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + ESCALATION_TTL * 1000).toISOString(),
            })
        );
    },

    /**
     * Check if auto-restart is currently disabled for a project.
     */
    async isEscalated(projectId: string): Promise<boolean> {
        const exists = await redis.exists(`${ESCALATION_FLAG_KEY}${projectId}`);
        return exists === 1;
    },

    /**
     * Clear the escalation flag manually (admin action).
     */
    async clearEscalation(projectId: string): Promise<void> {
        await redis.del(`${ESCALATION_FLAG_KEY}${projectId}`);
        logger.info({ projectId }, '[Escalation] Escalation cleared by admin');
    },

    /**
     * Get the full escalation status for a project (admin dashboard).
     */
    async getStatus(projectId: string): Promise<EscalationStatus> {
        const now = Date.now();
        const historyKey = `${FAILURE_HISTORY_KEY}${projectId}`;
        const flagKey = `${ESCALATION_FLAG_KEY}${projectId}`;

        // Trim stale events
        const windowStart = now - CRASH_WINDOW_MS;
        await redis.zremrangebyscore(historyKey, '-inf', windowStart);

        const [crashCount, isEscalated, cooldownTtl, rawEntries] = await Promise.all([
            redis.zcard(historyKey),
            redis.exists(flagKey),
            redis.ttl(flagKey),
            redis.zrevrange(historyKey, 0, 9), // Last 10 crashes
        ]);

        const recentFailures: FailureEntry[] = rawEntries.map((raw, i) => {
            const entry = JSON.parse(raw) as FailureEntry;
            entry.crashIndex = i + 1;
            return entry;
        });

        return {
            projectId,
            isEscalated: isEscalated === 1,
            crashesInWindow: crashCount,
            threshold: MAX_CRASHES_IN_WINDOW,
            windowMs: CRASH_WINDOW_MS,
            cooldownRemainingMs: cooldownTtl > 0 ? cooldownTtl * 1000 : 0,
            recentFailures,
        };
    },

    /**
     * Purge all failure history for a project (admin cleanup).
     */
    async purgeHistory(projectId: string): Promise<void> {
        await redis.del(`${FAILURE_HISTORY_KEY}${projectId}`);
        await redis.del(`${ESCALATION_FLAG_KEY}${projectId}`);
        logger.info({ projectId }, '[Escalation] Failure history purged');
    },
};
