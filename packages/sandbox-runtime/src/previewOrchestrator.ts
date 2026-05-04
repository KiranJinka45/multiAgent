import Bridge from '@packages/utils';
const { 
    PortManager, 
    ContainerManager, 
    ProcessManager, 
    RuntimeCapacity, 
    RollingRestart, 
    RuntimeHeartbeat, 
    RuntimeMetrics, 
    RuntimeRecord 
} = Bridge as any;

/**
 * previewOrchestrator.ts
 *
 * The single entry point for the Runtime Layer.
 */

import { PreviewRegistry, RuntimeStatus } from '@packages/registry';
import { RuntimeGuard } from './runtimeGuard';
import { redis } from '@packages/utils';
import path from 'path';
import fs from 'fs-extra';
import { logger } from '@packages/observability';

// ─── Configuration ────────────────────────────────────────────────────────────

const HEALTH_CHECK_INTERVAL = 30_000;
const URL_MODE: 'local' | 'proxy' = (process.env.PREVIEW_URL_MODE as 'local' | 'proxy') || 'local';

const healthCheckTimers = new Map<string, ReturnType<typeof setInterval>>();

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export const PreviewOrchestrator = {
    async start(projectId: string, executionId: string, userId?: string): Promise<string> {
        logger.info({ projectId, executionId, userId }, '[PreviewOrchestrator] Starting runtime');

        // Escalation gate
        const escalated = await Bridge.RuntimeEscalation.isEscalated(projectId);
        if (escalated) {
            const status = await Bridge.RuntimeEscalation.getStatus(projectId);
            const msg = `Auto-restart disabled — ${status.crashesInWindow} crashes in window.`;
            logger.warn({ projectId }, `[PreviewOrchestrator] ${msg}`);
            throw new Error(msg);
        }

        // Capacity gate
        const capacityCheck = await RuntimeCapacity.check(userId || 'unknown');
        if (!capacityCheck.allowed) {
            throw new Error(`Runtime capacity exceeded: ${capacityCheck.reason}`);
        }
        await RuntimeCapacity.reserve(userId || 'unknown');

        // 1. Initialize registry record
        await PreviewRegistry.init(projectId, executionId, userId);
        await PreviewRegistry.update(projectId, { status: 'STARTING' });

        try {
            const rootCwd = RuntimeGuard.resolveProjectPath(projectId);
            const hasWeb = await fs.pathExists(path.join(rootCwd, 'apps/web'));
            const hasApi = await fs.pathExists(path.join(rootCwd, 'apps/api'));

            const portCount = (hasWeb ? 1 : 0) + (hasApi ? 1 : 0) || 1;
            const ports = await PortManager.acquirePorts(projectId, portCount);
            
            const webPort = ports[0];
            const apiPort = hasWeb && hasApi ? ports[1] : webPort;

            const startTime = Date.now();

            if (hasApi) {
                logger.info({ projectId, port: apiPort }, '[PreviewOrchestrator] Starting API service');
                await ProcessManager.start(
                    projectId,
                    path.join(rootCwd, 'apps/api'),
                    'npm',
                    ['run', 'dev'],
                    { PORT: apiPort.toString() } as Record<string, string>,
                    60_000
                );
            }

            if (hasWeb) {
                logger.info({ projectId, port: webPort }, '[PreviewOrchestrator] Starting Web service');
                await ProcessManager.start(
                    projectId,
                    path.join(rootCwd, 'apps/web'),
                    'npm',
                    ['run', 'dev'],
                    { PORT: webPort.toString(), NEXT_PUBLIC_API_URL: `http://localhost:${apiPort}` } as Record<string, string>,
                    60_000
                );
            } else if (!hasApi) {
                await ProcessManager.start(
                    projectId,
                    rootCwd,
                    'npm',
                    ['run', 'dev'],
                    { PORT: webPort.toString() } as Record<string, string>,
                    60_000
                );
            }

            const startupMs = Date.now() - startTime;
            const previewUrl = this.buildUrl(projectId, webPort);

            const healthOk = await this.verifyHealth(projectId, webPort);
            if (!healthOk) throw new Error('Runtime web port failed health check');

            const pids = await ProcessManager.getPids(projectId);

            await PreviewRegistry.markRunning(projectId, previewUrl, ports, pids);
            
            await this.patchBuildState(executionId, previewUrl);
            await RuntimeMetrics.recordStart(projectId, startupMs);
            this.startHealthMonitor(projectId, previewUrl);

            await RuntimeHeartbeat.startLoop(projectId, pids, ports);

            logger.info({ projectId, previewUrl, ports, pids, startupMs }, '[PreviewOrchestrator] Runtime RUNNING');
            return previewUrl;
        } catch (err) {
            const reason = err instanceof Error ? err.message : String(err);
            await PreviewRegistry.markFailed(projectId, reason);
            await PortManager.releasePorts(projectId);
            await ProcessManager.stopAll(projectId);
            await RuntimeCapacity.release(userId || 'unknown');
            throw err;
        }
    },

    async stop(projectId: string): Promise<void> {
        logger.info({ projectId }, '[PreviewOrchestrator] Stopping runtime');
        this.stopHealthMonitor(projectId);
        await ProcessManager.stopAll(projectId);
        await PortManager.releasePorts(projectId);
        await PreviewRegistry.markStopped(projectId);
    },

    async restart(projectId: string): Promise<string> {
        logger.info({ projectId }, '[PreviewOrchestrator] Restarting runtime');
        const escalated = await Bridge.RuntimeEscalation.isEscalated(projectId);
        if (escalated) {
            const msg = 'Auto-restart disabled due to repeated crashes.';
            logger.error({ projectId }, `[PreviewOrchestrator] ${msg}`);
            await PreviewRegistry.update(projectId, { restartDisabled: true });
            throw new Error(msg);
        }

        const record = await PreviewRegistry.get(projectId);
        if (!record) throw new Error(`No runtime record found for projectId=${projectId}`);

        const newVersion = (record.runtimeVersion ?? 1) + 1;

        await this.stop(projectId);
        const url = await this.start(projectId, record.executionId, record.userId);

        await PreviewRegistry.update(projectId, { runtimeVersion: newVersion });
        return url;
    },

    async getStatus(projectId: string) {
        const record = await PreviewRegistry.get(projectId);
        return {
            status: record?.status ?? 'STOPPED',
            previewUrl: record?.previewUrl ?? null,
            runtimeVersion: record?.runtimeVersion,
            restartDisabled: record?.restartDisabled,
        };
    },

    async verifyHealth(projectId: string, port: number): Promise<boolean> {
        const url = `http://127.0.0.1:${port}`;
        const MAX_RETRIES = 60;
        for (let i = 0; i < MAX_RETRIES; i++) {
            try {
                const res = await fetch(url);
                if (res.ok) return true;
            } catch {}
            await new Promise((r: any) => setTimeout(r, 1000));
        }
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
                if (consecutiveFailures >= MAX_FAILURES) {
                    this.stopHealthMonitor(projectId);
                    await RuntimeMetrics.recordCrash(projectId, 'HEALTH_TIMEOUT');
                    const record = await PreviewRegistry.get(projectId);
                    const { restartAllowed } = await Bridge.RuntimeEscalation.recordCrash(
                        projectId,
                        'Health check timeout',
                        record?.pids?.[0] ?? null,
                        record?.ports?.[0] ?? null
                    );

                    if (restartAllowed) {
                        this.restart(projectId).catch(() => {});
                    } else {
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
        const processes = await ProcessManager.listAll();
        const pidMap = new Map((processes as any[]).map(p => [p.projectId, p]));

        return records.map((r: any) => ({
            ...r,
            processStatus: pidMap.get(r.projectId)?.status ?? 'IDLE',
        }));
    },
};


