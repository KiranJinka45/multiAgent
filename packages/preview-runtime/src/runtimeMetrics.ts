/**
 * runtimeMetrics.ts
 *
 * Observability layer for the Runtime System.
 * Tracks: start time, crash count, health check pass/fail,
 * duration, inactivity, and error classification.
 *
 * Backed by Redis sorted sets and hashes for fast aggregation.
 * No process logic. No port logic.
 */

import { redis } from '@packages/utils';
import { logger } from '@packages/utils';
import {
    runtimeStartupDuration,
    runtimeCrashesTotal,
    runtimeActiveTotal,
    runtimeProxyErrorsTotal
} from '@packages/utils';

const RUNTIME_MODE = (process.env.RUNTIME_MODE as 'process' | 'docker') || 'process';

const METRICS_PREFIX = 'runtime:metrics:';
const GLOBAL_STATS_KEY = 'runtime:global:stats';
const METRICS_TTL = 86400 * 7; // 7 days

export type RuntimeErrorType =
    | 'SPAWN_FAIL'
    | 'PORT_EXHAUSTED'
    | 'HEALTH_TIMEOUT'
    | 'PROCESS_CRASH'
    | 'REDIS_MISS'
    | 'PROXY_ERROR'
    | 'INACTIVITY_SHUTDOWN'
    // Phase 4: Eviction reasons
    | 'MAX_AGE_EXCEEDED'
    | 'IDLE_TIMEOUT'
    | 'STUCK_STARTING'
    | 'FAILED_CLEANUP'
    | 'CAPACITY_PREEMPTION';

export interface RuntimeMetricsSnapshot {
    projectId: string;
    totalStarts: number;
    totalCrashes: number;
    totalHealthChecks: number;
    totalHealthFailures: number;
    avgStartupMs: number;
    lastStartedAt: string | null;
    lastErrorType: RuntimeErrorType | null;
    uptimeMs: number;
    lastActivityAt: string | null;
}

export const RuntimeMetrics = {
    /** Record a successful process start with startup latency */
    async recordStart(projectId: string, startupMs: number): Promise<void> {
        const key = `${METRICS_PREFIX}${projectId}`;
        const now = Date.now();
        await redis.hset(key,
            'totalStarts', (await this._incr(key, 'totalStarts')).toString(),
            'lastStartedAt', new Date(now).toISOString(),
            'lastStartupMs', startupMs.toString(),
            'lastActivityAt', new Date(now).toISOString(),
        );
        await redis.expire(key, METRICS_TTL);

        await redis.hincrby(GLOBAL_STATS_KEY, 'totalStarts', 1);
        await redis.expire(GLOBAL_STATS_KEY, METRICS_TTL);

        // Phase 6: Live Prometheus metric
        runtimeStartupDuration.observe({ mode: RUNTIME_MODE }, startupMs / 1000);
        runtimeActiveTotal.inc();

        logger.info({ projectId, startupMs }, '[RuntimeMetrics] Start recorded');
    },

    /** Record a process crash */
    async recordCrash(projectId: string, errorType: RuntimeErrorType): Promise<void> {
        const key = `${METRICS_PREFIX}${projectId}`;
        await this._incr(key, 'totalCrashes');
        await redis.hset(key, 'lastErrorType', errorType, 'lastErrorAt', new Date().toISOString());
        await redis.expire(key, METRICS_TTL);
        await redis.hincrby(GLOBAL_STATS_KEY, 'totalCrashes', 1);

        // Phase 6: Live Prometheus metric
        runtimeCrashesTotal.inc({ reason: errorType, mode: RUNTIME_MODE });
        runtimeActiveTotal.dec();

        logger.warn({ projectId, errorType }, '[RuntimeMetrics] Crash recorded');
    },

    /** Record health check result */
    async recordHealthCheck(projectId: string, passed: boolean): Promise<void> {
        const key = `${METRICS_PREFIX}${projectId}`;
        await this._incr(key, 'totalHealthChecks');
        if (!passed) {
            await this._incr(key, 'totalHealthFailures');
        } else {
            await redis.hset(key, 'lastActivityAt', new Date().toISOString());
        }
        await redis.expire(key, METRICS_TTL);
    },

    /** Record user activity (iframe load, API call to proxy) */
    async recordActivity(projectId: string): Promise<void> {
        const key = `${METRICS_PREFIX}${projectId}`;
        await redis.hset(key, 'lastActivityAt', new Date().toISOString());
        await redis.expire(key, METRICS_TTL);
    },

    /** Get snapshot for a project */
    async getSnapshot(projectId: string): Promise<RuntimeMetricsSnapshot | null> {
        const key = `${METRICS_PREFIX}${projectId}`;
        const data = await redis.hgetall(key);
        if (!data || Object.keys(data).length === 0) return null;

        const lastStartedAt = data.lastStartedAt ?? null;
        const uptimeMs = lastStartedAt
            ? Date.now() - new Date(lastStartedAt).getTime()
            : 0;

        return {
            projectId,
            totalStarts: parseInt(data.totalStarts ?? '0'),
            totalCrashes: parseInt(data.totalCrashes ?? '0'),
            totalHealthChecks: parseInt(data.totalHealthChecks ?? '0'),
            totalHealthFailures: parseInt(data.totalHealthFailures ?? '0'),
            avgStartupMs: parseInt(data.lastStartupMs ?? '0'),
            lastStartedAt,
            lastErrorType: (data.lastErrorType as RuntimeErrorType) ?? null,
            uptimeMs,
            lastActivityAt: data.lastActivityAt ?? null,
        };
    },

    /** Get global platform-wide stats */
    async getGlobalStats(): Promise<Record<string, number>> {
        const data = await redis.hgetall(GLOBAL_STATS_KEY);
        return Object.fromEntries(
            Object.entries(data ?? {}).map(([k, v]) => [k, parseInt(v as string)])
        );
    },

    // ─── Internal ──────────────────────────────────────────────
    async _incr(key: string, field: string): Promise<number> {
        return redis.hincrby(key, field, 1);
    },
};
