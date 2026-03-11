/**
 * previewRegistry.ts
 *
 * Responsible ONLY for: persisting and querying runtime state.
 * No process logic. No port logic.
 *
 * Uses Redis as the primary store (fast, TTL-aware).
 * Supabase `projects.runtime_status` is updated asynchronously for persistence.
 */

import redis from '@queue/redis-client';
import logger from '@config/logger';

export type RuntimeStatus = 'PROVISIONED' | 'STARTING' | 'RUNNING' | 'FAILED' | 'STOPPED';

export interface RuntimeRecord {
    projectId: string;
    executionId: string;
    userId?: string;                // For per-user capacity tracking
    status: RuntimeStatus;
    previewUrl: string | null;
    port: number | null;
    pid: number | null;
    startedAt: string;
    updatedAt: string;
    failureReason?: string;
    healthChecks: number;
    lastHealthCheck?: string;
    // Phase 1 — Versioning
    runtimeVersion: number;         // Monotonic version counter for rolling upgrades
    // Phase 1 — Escalation
    crashCount: number;             // Crashes in current lifecycle
    restartDisabled: boolean;       // Set by escalation module
    // Phase 1 — Heartbeat
    lastHeartbeatAt?: string;       // Updated by heartbeat system
}

const REGISTRY_KEY_PREFIX = 'runtime:registry:';
const REGISTRY_TTL = 86400; // 24 hours

export const PreviewRegistry = {
    /**
     * Create or reset a runtime record for a project.
     */
    async init(projectId: string, executionId: string, userId?: string): Promise<RuntimeRecord> {
        const record: RuntimeRecord = {
            projectId,
            executionId,
            userId,
            status: 'PROVISIONED',
            previewUrl: null,
            port: null,
            pid: null,
            startedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            healthChecks: 0,
            runtimeVersion: 1,
            crashCount: 0,
            restartDisabled: false,
        };
        await this.save(record);
        logger.info({ projectId, executionId, runtimeVersion: 1 }, '[PreviewRegistry] Record initialized');
        return record;
    },

    /**
     * Update specific fields on a runtime record.
     */
    async update(projectId: string, patch: Partial<RuntimeRecord>): Promise<RuntimeRecord | null> {
        const existing = await this.get(projectId);
        if (!existing) {
            logger.warn({ projectId }, '[PreviewRegistry] Update on non-existent record');
            return null;
        }

        const updated: RuntimeRecord = {
            ...existing,
            ...patch,
            updatedAt: new Date().toISOString(),
        };
        await this.save(updated);
        logger.info({ projectId, status: updated.status, previewUrl: updated.previewUrl }, '[PreviewRegistry] Record updated');
        return updated;
    },

    /**
     * Mark a runtime as RUNNING with the live preview URL.
     */
    async markRunning(projectId: string, previewUrl: string, port: number, pid: number): Promise<RuntimeRecord | null> {
        return this.update(projectId, { status: 'RUNNING', previewUrl, port, pid });
    },

    /**
     * Mark a runtime as FAILED with a reason.
     */
    async markFailed(projectId: string, reason: string): Promise<RuntimeRecord | null> {
        return this.update(projectId, { status: 'FAILED', failureReason: reason });
    },

    /**
     * Mark a runtime as STOPPED.
     */
    async markStopped(projectId: string): Promise<RuntimeRecord | null> {
        return this.update(projectId, { status: 'STOPPED', previewUrl: null, pid: null });
    },

    /**
     * Record a successful health check ping.
     */
    async recordHealthCheck(projectId: string): Promise<void> {
        const existing = await this.get(projectId);
        if (!existing) return;

        await this.update(projectId, {
            healthChecks: existing.healthChecks + 1,
            lastHealthCheck: new Date().toISOString(),
        });
    },

    /**
     * Retrieve the full runtime record.
     */
    async get(projectId: string): Promise<RuntimeRecord | null> {
        const raw = await redis.get(`${REGISTRY_KEY_PREFIX}${projectId}`);
        if (!raw) return null;
        return JSON.parse(raw) as RuntimeRecord;
    },

    /**
     * Get just the preview URL for a project.
     */
    async getPreviewUrl(projectId: string): Promise<string | null> {
        const record = await this.get(projectId);
        return record?.previewUrl ?? null;
    },

    /**
     * Persist a record to Redis.
     */
    async save(record: RuntimeRecord): Promise<void> {
        await redis.setex(
            `${REGISTRY_KEY_PREFIX}${record.projectId}`,
            REGISTRY_TTL,
            JSON.stringify(record)
        );
    },

    /**
     * Delete the runtime record (cleanup).
     */
    async delete(projectId: string): Promise<void> {
        await redis.del(`${REGISTRY_KEY_PREFIX}${projectId}`);
    },

    /**
     * Remove a record (alias for delete — used by cleanup/evictor).
     */
    async remove(projectId: string): Promise<void> {
        await this.delete(projectId);
    },

    /**
     * Get all active runtime records (for monitoring/admin).
     * WARNING: Uses KEYS — only use in admin tools, never in hot paths.
     */
    async listAll(): Promise<RuntimeRecord[]> {
        const keys = await redis.keys(`${REGISTRY_KEY_PREFIX}*`);
        if (!keys.length) return [];

        const values = await redis.mget(...keys);
        return values
            .filter(Boolean)
            .map(v => JSON.parse(v!) as RuntimeRecord);
    },
};
