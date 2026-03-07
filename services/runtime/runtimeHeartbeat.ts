/**
 * runtimeHeartbeat.ts
 *
 * Phase 1 — Feature 4: Runtime Heartbeat System
 *
 * Every running preview process must publish a heartbeat every 15 seconds.
 * If a project's heartbeat goes silent for > 45 seconds → it's a zombie.
 *
 * Architecture:
 *  - EACH running runtime sets: runtime:heartbeat:{projectId} → timestamp, EX 45s
 *  - Heartbeat monitor scans all registry records and checks key existence
 *  - Missing key = zombie → trigger cleanup
 *
 * This module provides:
 *  1. publishHeartbeat()    — called by previewOrchestrator on an interval
 *  2. isZombie()            — checks if heartbeat key is missing
 *  3. startHeartbeatLoop()  — starts the per-project publish interval
 *  4. stopHeartbeatLoop()   — clears the interval
 *  5. scanForZombies()      — called by runtimeCleanup worker
 *
 * No process logic. No port logic. No URL logic.
 */

import redis from '@queue/redis-client';
import logger from '@configs/logger';

const HEARTBEAT_PREFIX = 'runtime:heartbeat:';
const HEARTBEAT_TTL_SEC = 45;  // Key auto-expires if heartbeat stops
const HEARTBEAT_EVERY_MS = 15_000;

// In-process map of per-project heartbeat intervals
const heartbeatTimers = new Map<string, ReturnType<typeof setInterval>>();

export const RuntimeHeartbeat = {
    /**
     * Publish (renew) the heartbeat key for a project.
     * The key expires in 45s — if not renewed, it's treated as dead.
     */
    async publish(projectId: string, pid: number, port: number): Promise<void> {
        await redis.setex(
            `${HEARTBEAT_PREFIX}${projectId}`,
            HEARTBEAT_TTL_SEC,
            JSON.stringify({
                projectId,
                pid,
                port,
                ts: new Date().toISOString(),
            })
        );
    },

    /**
     * Check whether a project is a zombie (heartbeat key missing).
     * Returns true if the project SHOULD be running but has no recent heartbeat.
     */
    async isZombie(projectId: string): Promise<boolean> {
        const exists = await redis.exists(`${HEARTBEAT_PREFIX}${projectId}`);
        return exists === 0;
    },

    /**
     * Start the per-project heartbeat publish loop.
     * Call after a runtime is confirmed RUNNING.
     */
    startLoop(projectId: string, pid: number, port: number): void {
        this.stopLoop(projectId); // Idempotent

        const timer = setInterval(async () => {
            try {
                await this.publish(projectId, pid, port);
                logger.debug({ projectId, pid, port }, '[Heartbeat] Published');
            } catch (err) {
                logger.error({ projectId, err }, '[Heartbeat] Publish failed');
            }
        }, HEARTBEAT_EVERY_MS);

        // Publish immediately instead of waiting first interval
        this.publish(projectId, pid, port).catch(() => { });

        if (timer.unref) timer.unref(); // Don't hold event loop
        heartbeatTimers.set(projectId, timer);
        logger.info({ projectId, pid, port }, '[Heartbeat] Loop started');
    },

    /**
     * Stop the heartbeat loop for a project (call on stop/restart).
     */
    stopLoop(projectId: string): void {
        const timer = heartbeatTimers.get(projectId);
        if (timer) {
            clearInterval(timer);
            heartbeatTimers.delete(projectId);
        }
        // Remove the key so it's not picked up as zombie by scanner
        redis.del(`${HEARTBEAT_PREFIX}${projectId}`).catch(() => { });
    },

    /**
     * Stop all heartbeat loops (for graceful shutdown).
     */
    stopAll(): void {
        for (const [projectId] of heartbeatTimers) {
            this.stopLoop(projectId);
        }
        logger.info('[Heartbeat] All loops stopped');
    },

    /**
     * Scan all RUNNING registry entries and identify zombies.
     * Called by runtimeCleanup on its cycle.
     *
     * Returns list of zombie projectIds.
     */
    async scanForZombies(runningProjectIds: string[]): Promise<string[]> {
        const zombies: string[] = [];

        await Promise.all(
            runningProjectIds.map(async (projectId) => {
                const zombie = await this.isZombie(projectId);
                if (zombie) {
                    logger.warn({ projectId }, '[Heartbeat] Zombie detected — no heartbeat');
                    zombies.push(projectId);
                }
            })
        );

        return zombies;
    },

    /**
     * Get the last heartbeat data for a project (for admin/debugging).
     */
    async getLast(projectId: string): Promise<{ pid: number; port: number; ts: string } | null> {
        const raw = await redis.get(`${HEARTBEAT_PREFIX}${projectId}`);
        if (!raw) return null;
        return JSON.parse(raw);
    },
};
