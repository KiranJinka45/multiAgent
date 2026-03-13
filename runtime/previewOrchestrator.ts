/**
 * previewOrchestrator.ts
 *
 * The single entry point for the Runtime Layer.
 * Coordinates all Phase 1 modules:
 *   ProcessManager → PortManager → PreviewRegistry
 *   + RuntimeCapacity (quota guard)
 *   + RuntimeHeartbeat (15s liveness)
 *   + RuntimeEscalation (crash threshold)
 *   + RuntimeMetrics (observability)
 *   + RuntimeGuard (security)
 *
 * Called AFTER infra provisioning succeeds.
 * The provisioning layer does NOT change — this is additive.
 *
 * Usage (from orchestrator.ts, after completion):
 *   await PreviewOrchestrator.start(projectId, executionId, userId);
 */

import { ProcessManager } from './processManager';
import { ContainerManager } from './containerManager';
import { PortManager } from './portManager';
import { PreviewRegistry, RuntimeStatus } from './previewRegistry';
import { RuntimeMetrics } from './runtimeMetrics';
import { RuntimeGuard } from './runtimeGuard';
import { RuntimeCapacity } from './runtimeCapacity';
import { RuntimeHeartbeat } from './runtimeHeartbeat';
import { RuntimeEscalation } from './runtimeEscalation';
import redis from '@queue/redis-client';
import logger from '@config/logger';

// ─── Configuration ────────────────────────────────────────────────────────────

const HEALTH_CHECK_INTERVAL = 30_000;

const URL_MODE: 'local' | 'proxy' = (process.env.PREVIEW_URL_MODE as 'local' | 'proxy') || 'local';

// Phase 2: Runtime mode — 'process' (child_process.spawn) or 'docker' (container)
const RUNTIME_MODE: 'process' | 'docker' =
    (process.env.RUNTIME_MODE as 'process' | 'docker') || 'process';

const healthCheckTimers = new Map<string, ReturnType<typeof setInterval>>();

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export const PreviewOrchestrator = {
    /**
     * PRIMARY ENTRY POINT.
     *
     * Start the runtime for a project that has finished provisioning.
     *
     * Phase 1 additions:
     *  - Capacity check before starting (system + user quota)
     *  - Escalation check (was auto-restart disabled?)
     *  - Heartbeat loop after RUNNING
     *  - Version tracking in registry
     *  - userId passed through for per-user capacity tracking
     */
    async start(projectId: string, executionId: string, userId?: string): Promise<string> {
        logger.info({ projectId, executionId, userId }, '[PreviewOrchestrator] Starting runtime');

        // ── Phase 1: Escalation gate ────────────────────────────────────
        const escalated = await RuntimeEscalation.isEscalated(projectId);
        if (escalated) {
            const status = await RuntimeEscalation.getStatus(projectId);
            const msg = `Auto-restart disabled — ${status.crashesInWindow} crashes in ${status.windowMs / 60000}min window. Cooldown: ${Math.ceil(status.cooldownRemainingMs / 1000)}s`;
            logger.warn({ projectId }, `[PreviewOrchestrator] ${msg}`);
            throw new Error(msg);
        }

        // ── Phase 1: Capacity gate ──────────────────────────────────────
        const capacityCheck = await RuntimeCapacity.check(userId ?? 'unknown');
        if (!capacityCheck.allowed) {
            logger.warn({ projectId, userId, ...capacityCheck }, '[PreviewOrchestrator] Capacity exceeded');

            // Enqueue for later start when a slot opens
            await RuntimeCapacity.enqueue({
                projectId,
                userId: userId ?? 'unknown',
                executionId,
                enqueuedAt: new Date().toISOString(),
            });

            throw new Error(`Runtime capacity exceeded: ${capacityCheck.reason}. Queued at position #${capacityCheck.queueDepth + 1}`);
        }

        // ── Reserve capacity slot ───────────────────────────────────────
        await RuntimeCapacity.reserve(userId ?? 'unknown');

        // 1. Initialize registry record (with userId for capacity tracking)
        await PreviewRegistry.init(projectId, executionId, userId);
        await PreviewRegistry.update(projectId, { status: 'STARTING' });

        try {
            // 2. Acquire a free, collision-safe port
            const port = await PortManager.acquireFreePort(projectId);

            // 3. Resolve and validate project working directory
            const cwd = RuntimeGuard.resolveProjectPath(projectId);

            const startTime = Date.now();
            let pid: number;

            // 4. Phase 2: Dual-mode spawn ───────────────────────────────
            if (RUNTIME_MODE === 'docker') {
                logger.info({ projectId, port }, '[PreviewOrchestrator] Docker mode: starting container');
                const { containerId } = await ContainerManager.start(projectId, port, 60_000);
                pid = parseInt(containerId, 16) || 0; // Use container short ID as pseudo-PID
            } else {
                await ProcessManager.start(
                    projectId,
                    cwd,
                    'npm',
                    ['run', 'dev'],
                    { PORT: port.toString() } as Partial<NodeJS.ProcessEnv>,
                    60_000
                );
                pid = ProcessManager.getPid(projectId)!;
            }
            // ──────────────────────────────────────────────────────────
            const startupMs = Date.now() - startTime;

            // 5. Resolve the public URL
            const previewUrl = this.buildUrl(projectId, port);

            // 5.5. VERIFICATION LOOP (Reliability Upgrade)
            logger.info({ projectId, port, previewUrl }, '[PreviewOrchestrator] Verifying runtime health...');
            const healthOk = await this.verifyHealth(projectId, port);
            if (!healthOk) {
                throw new Error('Runtime started but failed health check (timeout after 30s)');
            }

            // 6. Mark as RUNNING in registry
            await PreviewRegistry.markRunning(projectId, previewUrl, port, pid);
            
            // 6.5. Double-write for Proxy compatibility (Fix for "Preview not found")
            await redis.set(`preview:${projectId}`, JSON.stringify({
                port,
                status: 'running',
                previewUrl,
                updatedAt: Date.now()
            }), 'EX', 3600); // 1 hour TTL

            // 7. Persist to Redis build state for SSE delivery
            await this.patchBuildState(executionId, previewUrl);

            // 8. Record metrics
            await RuntimeMetrics.recordStart(projectId, startupMs);

            // 9. Start background health monitor
            this.startHealthMonitor(projectId, previewUrl);

            // 10. Start heartbeat loop (15s publish)
            RuntimeHeartbeat.startLoop(projectId, pid, port);

            logger.info({ projectId, previewUrl, port, pid, startupMs, mode: RUNTIME_MODE }, '[PreviewOrchestrator] Runtime RUNNING');
            return previewUrl;

        } catch (err) {
            const reason = err instanceof Error ? err.message : String(err);
            await PreviewRegistry.markFailed(projectId, reason);
            await PortManager.releasePort(projectId);
            await RuntimeMetrics.recordCrash(projectId, 'SPAWN_FAIL');
            await RuntimeEscalation.recordCrash(projectId, reason);
            await RuntimeCapacity.release(userId ?? 'unknown');

            logger.error({ projectId, reason, mode: RUNTIME_MODE }, '[PreviewOrchestrator] Runtime FAILED');
            throw err;
        }
    },

    /**
     * Gracefully stop the runtime for a project.
     */
    async stop(projectId: string): Promise<void> {
        logger.info({ projectId, mode: RUNTIME_MODE }, '[PreviewOrchestrator] Stopping runtime');

        RuntimeHeartbeat.stopLoop(projectId);
        this.stopHealthMonitor(projectId);

        // Phase 2: Dual-mode stop
        if (RUNTIME_MODE === 'docker') {
            await ContainerManager.stop(projectId);
        } else {
            await ProcessManager.stop(projectId);
        }

        await PortManager.releasePort(projectId);

        const record = await PreviewRegistry.get(projectId);
        if (record?.userId) {
            await RuntimeCapacity.release(record.userId);
        }

        await PreviewRegistry.markStopped(projectId);
        logger.info({ projectId }, '[PreviewOrchestrator] Runtime stopped');
    },

    /**
     * Restart the runtime (e.g. after a crash is detected).
     * Phase 1: Checks escalation status before restarting.
     */
    async restart(projectId: string): Promise<string> {
        logger.info({ projectId }, '[PreviewOrchestrator] Restarting runtime');

        // Phase 1: Escalation gate for restarts
        const escalated = await RuntimeEscalation.isEscalated(projectId);
        if (escalated) {
            const msg = 'Auto-restart disabled due to repeated crashes. Manual intervention required.';
            logger.error({ projectId }, `[PreviewOrchestrator] ${msg}`);
            await PreviewRegistry.update(projectId, { restartDisabled: true });
            throw new Error(msg);
        }

        const record = await PreviewRegistry.get(projectId);
        if (!record) throw new Error(`No runtime record found for projectId=${projectId}`);

        // Increment version on restart
        const newVersion = (record.runtimeVersion ?? 1) + 1;

        await this.stop(projectId);
        const url = await this.start(projectId, record.executionId, record.userId);

        // Update version in registry
        await PreviewRegistry.update(projectId, { runtimeVersion: newVersion });

        logger.info({ projectId, runtimeVersion: newVersion }, '[PreviewOrchestrator] Restart complete (version bumped)');
        return url;
    },

    /**
     * Get the current runtime status for a project.
     */
    async getStatus(projectId: string): Promise<{
        status: RuntimeStatus;
        previewUrl: string | null;
        runtimeVersion?: number;
        restartDisabled?: boolean;
    }> {
        const record = await PreviewRegistry.get(projectId);
        return {
            status: record?.status ?? 'STOPPED',
            previewUrl: record?.previewUrl ?? null,
            runtimeVersion: record?.runtimeVersion,
            restartDisabled: record?.restartDisabled,
        };
    },

    // ─── Internal Helpers ───────────────────────────────────────────────────

    async verifyHealth(projectId: string, port: number): Promise<boolean> {
        const url = `http://localhost:${port}`;
        const MAX_RETRIES = 30; // 30 seconds
        for (let i = 0; i < MAX_RETRIES; i++) {
            try {
                const res = await fetch(url);
                if (res.ok) {
                    logger.info({ projectId, port, attempt: i + 1 }, '[PreviewOrchestrator] Health check PASSED');
                    return true;
                }
            } catch {
                // Ignore connection errors during boot
            }
            await new Promise(r => setTimeout(r, 1000));
        }
        logger.error({ projectId, port }, '[PreviewOrchestrator] Health check FAILED after 30s');
        return false;
    },

    buildUrl(projectId: string, port: number): string {
        if (URL_MODE === 'proxy') {
            const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
            return `${cleanBase}/api/preview-proxy/${projectId}`;
        }
        return `http://localhost:${port}`;
    },

    async patchBuildState(executionId: string, previewUrl: string): Promise<void> {
        const key = `build:state:${executionId}`;
        const raw = await redis.get(key);
        if (!raw) return;

        const state = JSON.parse(raw);
        state.previewUrl = previewUrl;
        await redis.setex(key, 86400, JSON.stringify(state));
        await redis.publish(`build:progress:${executionId}`, JSON.stringify(state));
    },

    /**
     * Health monitor — now integrates with escalation system.
     */
    startHealthMonitor(projectId: string, previewUrl: string): void {
        this.stopHealthMonitor(projectId);

        let consecutiveFailures = 0;
        const MAX_FAILURES = 3;

        const timer = setInterval(async () => {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 5000);

                const res = await fetch(previewUrl, { signal: controller.signal });
                clearTimeout(timeout);

                if (res.ok) {
                    consecutiveFailures = 0;
                    await RuntimeMetrics.recordHealthCheck(projectId, true);
                    await PortManager.renewLease(projectId);
                } else {
                    throw new Error(`HTTP ${res.status}`);
                }
            } catch {
                consecutiveFailures++;
                await RuntimeMetrics.recordHealthCheck(projectId, false);
                logger.warn({ projectId, consecutiveFailures, previewUrl }, '[HealthMonitor] Check failed');

                if (consecutiveFailures >= MAX_FAILURES) {
                    logger.error({ projectId }, '[HealthMonitor] Max failures reached');
                    this.stopHealthMonitor(projectId);
                    await RuntimeMetrics.recordCrash(projectId, 'HEALTH_TIMEOUT');

                    // Phase 1: Check escalation before restarting
                    const record = await PreviewRegistry.get(projectId);
                    const { restartAllowed } = await RuntimeEscalation.recordCrash(
                        projectId,
                        'Health check timeout',
                        record?.pid ?? null,
                        record?.port ?? null
                    );

                    if (restartAllowed) {
                        this.restart(projectId).catch((restartErr) => {
                            logger.error({ projectId, restartErr }, '[HealthMonitor] Restart failed');
                            PreviewRegistry.markFailed(projectId, 'Restart failed after health check failures');
                            RuntimeMetrics.recordCrash(projectId, 'PROCESS_CRASH');
                        });
                    } else {
                        logger.error({ projectId }, '[HealthMonitor] Restart BLOCKED by escalation');
                        await PreviewRegistry.update(projectId, { restartDisabled: true, status: 'FAILED' });
                    }
                }
            }
        }, HEALTH_CHECK_INTERVAL);

        healthCheckTimers.set(projectId, timer);
    },

    stopHealthMonitor(projectId: string): void {
        const existing = healthCheckTimers.get(projectId);
        if (existing) {
            clearInterval(existing);
            healthCheckTimers.delete(projectId);
        }
    },

    async listAll() {
        const records = await PreviewRegistry.listAll();
        const processes = ProcessManager.listAll();
        const pidMap = new Map(processes.map(p => [p.projectId, p]));

        return records.map(r => ({
            ...r,
            processStatus: pidMap.get(r.projectId)?.status ?? 'IDLE',
        }));
    },
};
