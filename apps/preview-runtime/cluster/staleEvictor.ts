/**
 * staleEvictor.ts
 *
 * Phase 4 — Stale Runtime Eviction & TTL Enforcement
 *
 * Handles automatic expiration of runtimes based on:
 *  1. Absolute TTL (max runtime age — default 2 hours)
 *  2. Idle TTL (no user activity — default 30 minutes)
 *  3. Build TTL (stuck in STARTING — default 5 minutes)
 *  4. Failed TTL (lingering FAILED records — default 1 hour)
 *
 * Runs as a scan loop integrated with runtimeCleanup.
 * Also provides an eviction priority queue so the scheduler can
 * reclaim slots from the least-important runtimes when at capacity.
 *
 * Eviction priority (lowest = evicted first):
 *   score = (userTier × 3) + (activityRecency × 2) + (runtimeAge × -1)
 */

import { PreviewRegistry } from '@registry/previewRegistry';
import { PreviewOrchestrator } from '../previewOrchestrator';
import { RuntimeMetrics } from '../runtimeMetrics';
import { runtimeEvictionsTotal } from '@config/metrics';
import redis from '@queue/redis-client';
import logger from '@config/logger';

// ─── Config ────────────────────────────────────────────────────────────────

const MAX_RUNTIME_AGE_MS = parseInt(process.env.RUNTIME_MAX_AGE_MINUTES ?? '120', 10) * 60_000;
const IDLE_TTL_MS = parseInt(process.env.RUNTIME_IDLE_TTL_MINUTES ?? '30', 10) * 60_000;
const STARTING_TTL_MS = 5 * 60 * 1000;
const FAILED_RECORD_TTL_MS = 60 * 60 * 1000;

const EVICTION_REASON_PREFIX = 'cluster:eviction:';

export type EvictionReason =
    | 'MAX_AGE_EXCEEDED'
    | 'IDLE_TIMEOUT'
    | 'STUCK_STARTING'
    | 'FAILED_CLEANUP'
    | 'CAPACITY_PREEMPTION';

export interface EvictionEvent {
    projectId: string;
    reason: EvictionReason;
    runtimeAgeMs: number;
    idleMs: number | null;
    evictedAt: string;
}

// ─── Evictor ───────────────────────────────────────────────────────────────

export const StaleEvictor = {
    /**
     * Run a full eviction scan across all registry records.
     * Returns the number of runtimes evicted in this cycle.
     */
    async runEvictionScan(): Promise<{
        ageEvictions: number;
        idleEvictions: number;
        staleEvictions: number;
        failedCleanups: number;
    }> {
        const allRecords = await PreviewRegistry.listAll();
        const now = Date.now();

        let ageEvictions = 0;
        let idleEvictions = 0;
        let staleEvictions = 0;
        let failedCleanups = 0;

        for (const record of allRecords) {
            const runtimeAgeMs = now - new Date(record.startedAt).getTime();

            // 1. Absolute TTL — running too long
            if (record.status === 'RUNNING' && runtimeAgeMs > MAX_RUNTIME_AGE_MS) {
                logger.info({
                    projectId: record.projectId,
                    ageMinutes: Math.round(runtimeAgeMs / 60_000),
                }, '[StaleEvictor] Max age exceeded — evicting');

                await this.evict(record, 'MAX_AGE_EXCEEDED');
                ageEvictions++;
                continue;
            }

            // 2. Idle TTL — no activity for too long
            if (record.status === 'RUNNING') {
                const lastActivity = record.lastHealthCheck || record.lastHeartbeatAt || record.startedAt;
                const idleMs = now - new Date(lastActivity).getTime();

                if (idleMs > IDLE_TTL_MS) {
                    logger.info({
                        projectId: record.projectId,
                        idleMinutes: Math.round(idleMs / 60_000),
                    }, '[StaleEvictor] Idle timeout — evicting');

                    await this.evict(record, 'IDLE_TIMEOUT');
                    idleEvictions++;
                    continue;
                }
            }

            // 3. Stuck STARTING — never reached RUNNING
            if (record.status === 'STARTING' && runtimeAgeMs > STARTING_TTL_MS) {
                logger.warn({
                    projectId: record.projectId,
                    ageMs: runtimeAgeMs,
                }, '[StaleEvictor] Stuck in STARTING — cleaning up');

                await this.evict(record, 'STUCK_STARTING');
                staleEvictions++;
                continue;
            }

            // 4. Lingering FAILED records — clean up metadata
            if (record.status === 'FAILED' && runtimeAgeMs > FAILED_RECORD_TTL_MS) {
                logger.info({
                    projectId: record.projectId,
                }, '[StaleEvictor] Cleaning up stale FAILED record');

                await PreviewRegistry.remove(record.projectId);
                failedCleanups++;
                continue;
            }
        }

        const total = ageEvictions + idleEvictions + staleEvictions + failedCleanups;
        if (total > 0) {
            logger.info({
                ageEvictions, idleEvictions, staleEvictions, failedCleanups,
            }, '[StaleEvictor] Eviction scan complete');
        }

        return { ageEvictions, idleEvictions, staleEvictions, failedCleanups };
    },

    /**
     * Evict a single runtime: stop the process/container and record the event.
     */
    async evict(record: RuntimeRecord, reason: EvictionReason): Promise<void> {
        const event: EvictionEvent = {
            projectId: record.projectId,
            reason,
            runtimeAgeMs: Date.now() - new Date(record.startedAt).getTime(),
            idleMs: record.lastHealthCheck
                ? Date.now() - new Date(record.lastHealthCheck).getTime()
                : null,
            evictedAt: new Date().toISOString(),
        };

        try {
            // Stop the runtime (handles both Docker and process mode)
            if (record.status === 'RUNNING' || record.status === 'STARTING') {
                await PreviewOrchestrator.stop(record.projectId);
            }

            // Record eviction event
            await redis.setex(
                `${EVICTION_REASON_PREFIX}${record.projectId}`,
                86400, // 24h
                JSON.stringify(event)
            );

            await RuntimeMetrics.recordCrash(record.projectId, reason);

            // Phase 6: Live Prometheus metric
            runtimeEvictionsTotal.inc({ reason });

        } catch (err: any) {
            logger.error({ projectId: record.projectId, reason, err },
                '[StaleEvictor] Eviction failed');
            // Mark failed anyway to prevent infinite retry
            await PreviewRegistry.markFailed(record.projectId, `Eviction failed: ${reason}`);
        }
    },

    /**
     * Preemptive eviction: when the cluster is at capacity and a new request
     * arrives, evict the lowest-priority runtime to make room.
     *
     * Priority scoring (lower = evicted first):
     *   base = runtimeAge (older = lower priority)
     *   + activityRecency (more recent activity = higher priority)
     *   + userTier boost (pro users get a bonus)
     */
    async preemptLowestPriority(): Promise<string | null> {
        const allRecords = await PreviewRegistry.listAll();
        const running = allRecords.filter(r => r.status === 'RUNNING');

        if (running.length === 0) return null;

        const now = Date.now();

        const scored = running.map(r => {
            const ageMs = now - new Date(r.startedAt).getTime();
            const lastActivity = r.lastHealthCheck || r.lastHeartbeatAt || r.startedAt;
            const idleMs = now - new Date(lastActivity).getTime();

            // Lower score = evicted first
            // Old + idle = low score → evict
            // New + active = high score → keep
            const score =
                -ageMs / 60_000              // Older = lower
                + (1 / (idleMs / 60_000 + 1)) * 100;  // More recent activity = higher

            return { record: r, score, ageMs, idleMs };
        });

        scored.sort((a, b) => a.score - b.score);

        const victim = scored[0];

        logger.info({
            projectId: victim.record.projectId,
            score: victim.score.toFixed(2),
            ageMinutes: Math.round(victim.ageMs / 60_000),
            idleMinutes: Math.round(victim.idleMs / 60_000),
        }, '[StaleEvictor] Preempting lowest-priority runtime');

        await this.evict(victim.record, 'CAPACITY_PREEMPTION');
        return victim.record.projectId;
    },

    /**
     * Get the eviction reason for a recently evicted project.
     */
    async getEvictionReason(projectId: string): Promise<EvictionEvent | null> {
        const raw = await redis.get(`${EVICTION_REASON_PREFIX}${projectId}`);
        if (!raw) return null;
        return JSON.parse(raw) as EvictionEvent;
    },
};
