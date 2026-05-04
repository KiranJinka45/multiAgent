/**
 * previewOrchestrator.ts
 */

import { ProcessManager } from './processManager.js';
import { ContainerManager } from './containerManager.js';
import { PortManager } from './portManager.js';
import { PreviewRegistry, RuntimeStatus } from '@packages/registry';
import { RuntimeMetrics } from './runtimeMetrics.js';
import { PreviewRuntimePool } from './previewRuntimePool.js';
import { RuntimeGuard } from './runtimeGuard.js';
import { RuntimeCapacity } from './runtimeCapacity.js';
import { RuntimeHeartbeat } from './runtimeHeartbeat.js';
import { RuntimeEscalation } from './runtimeEscalation.js';
import { redis } from '@packages/utils';
import path from 'path';
import { logger } from '@packages/utils';
import { ArtifactValidator } from '@packages/validator';

const HEALTH_CHECK_INTERVAL = 30_000;
const URL_MODE: 'local' | 'proxy' = (process.env.PREVIEW_URL_MODE as 'local' | 'proxy') || 'local';
const RUNTIME_MODE: 'process' | 'docker' = (process.env.RUNTIME_MODE as 'process' | 'docker') || 'process';
const healthCheckTimers = new Map<string, ReturnType<typeof setInterval>>();

export const PreviewOrchestrator = {
    async start(projectId: string, executionId: string, userId?: string): Promise<string> {
        logger.info({ projectId, executionId, userId }, '[PreviewOrchestrator] Starting runtime');
        const escalated = await RuntimeEscalation.isEscalated(projectId);
        if (escalated) {
            const status = await RuntimeEscalation.getStatus(projectId);
            throw new Error(`Auto-restart disabled — ${status.crashesInWindow} crashes.`);
        }

        const capacityCheck = await RuntimeCapacity.check(userId ?? 'unknown');
        if (!capacityCheck.allowed) {
            await RuntimeCapacity.enqueue({ projectId, userId: userId ?? 'unknown', executionId, enqueuedAt: new Date().toISOString() });
            throw new Error(`Runtime capacity exceeded: ${capacityCheck.reason}.`);
        }

        await RuntimeCapacity.reserve(userId ?? 'unknown');
        await PreviewRegistry.init(projectId, executionId, userId);
        await PreviewRegistry.update(projectId, { status: 'STARTING' });

        try {
            const port = await PortManager.acquireFreePort(projectId);
            const cwd = RuntimeGuard.resolveProjectPath(projectId);
            const startTime = Date.now();
            let pid: number;

            if (RUNTIME_MODE === 'docker') {
                const warmContainer = await PreviewRuntimePool.checkout(projectId, port);
                if (warmContainer) {
                    const projectDir = path.join(process.cwd(), '.generated-projects', projectId);
                    await ContainerManager.hotInject(warmContainer.containerId, projectDir);
                    pid = parseInt(warmContainer.containerId, 16) || 0;
                    PreviewRuntimePool.replenish();
                } else {
                    const { containerId } = await ContainerManager.start(projectId, port, 60_000);
                    pid = parseInt(containerId, 16) || 0;
                }
            } else {
                await ProcessManager.start(projectId, cwd, 'npm', ['run', 'dev'], { PORT: port.toString() } as Partial<NodeJS.ProcessEnv>, 60_000);
                pid = ProcessManager.getPid(projectId)!;
            }

            const previewUrl = this.buildUrl(projectId, port);
            const validation = await ArtifactValidator.validate(projectId);
            if (!validation.valid) throw new Error('Artifact validation failed');

            const healthOk = await this.verifyHealth(projectId, port);
            if (!healthOk) throw new Error('Health check timeout');

            await PreviewRegistry.markRunning(projectId, previewUrl, port, pid);
            await this.patchBuildState(executionId, previewUrl);
            await RuntimeMetrics.recordStart(projectId, Date.now() - startTime);
            this.startHealthMonitor(projectId, previewUrl);
            RuntimeHeartbeat.startLoop(projectId, pid, port);

            return previewUrl;
        } catch (err) {
            const reason = err instanceof Error ? err.message : String(err);
            await PreviewRegistry.markFailed(projectId, reason);
            await PortManager.releasePort(projectId);
            await RuntimeMetrics.recordCrash(projectId, 'SPAWN_FAIL');
            await RuntimeEscalation.recordCrash(projectId, reason);
            await RuntimeCapacity.release(userId ?? 'unknown');
            throw err;
        }
    },

    async stop(projectId: string): Promise<void> {
        RuntimeHeartbeat.stopLoop(projectId);
        this.stopHealthMonitor(projectId);
        if (RUNTIME_MODE === 'docker') await ContainerManager.stop(projectId);
        else await ProcessManager.stop(projectId);
        await PortManager.releasePort(projectId);
        const record = await PreviewRegistry.get(projectId);
        if (record?.userId) await RuntimeCapacity.release(record.userId);
        await PreviewRegistry.markStopped(projectId);
    },

    async restart(projectId: string): Promise<string> {
        const record = await PreviewRegistry.get(projectId);
        if (!record) throw new Error(`No record for ${projectId}`);
        await this.stop(projectId);
        return await this.start(projectId, record.executionId, record.userId);
    },

    async getStatus(projectId: string) {
        const record = await PreviewRegistry.get(projectId);
        return { status: record?.status ?? 'STOPPED', previewUrl: record?.previewUrl ?? null };
    },

    async verifyHealth(projectId: string, port: number): Promise<boolean> {
        const url = `http://127.0.0.1:${port}`;
        for (let i = 0; i < 60; i++) {
            try {
                const res = await fetch(url);
                if (res.ok) return true;
            } catch {}
            await new Promise(r => setTimeout(r, 1000));
        }
        return false;
    },

    buildUrl(projectId: string, port: number): string {
        if (URL_MODE === 'proxy') {
            const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            return `${base.endsWith('/') ? base.slice(0, -1) : base}/api/preview-proxy/${projectId}`;
        }
        return `http://localhost:${port}`;
    },

    async patchBuildState(executionId: string, previewUrl: string) {
        const key = `build:state:${executionId}`;
        const raw = await redis.get(key);
        if (!raw) return;
        const state = JSON.parse(raw);
        state.previewUrl = previewUrl;
        await redis.setex(key, 86400, JSON.stringify(state));
        await redis.publish(`build:progress:${executionId}`, JSON.stringify(state));
    },

    startHealthMonitor(projectId: string, previewUrl: string) {
        this.stopHealthMonitor(projectId);
        let failures = 0;
        const timer = setInterval(async () => {
            try {
                const res = await fetch(previewUrl);
                if (res.ok) {
                    failures = 0;
                    await RuntimeMetrics.recordHealthCheck(projectId, true);
                    await PortManager.renewLease(projectId);
                } else throw new Error();
            } catch {
                failures++;
                if (failures >= 3) {
                    this.stopHealthMonitor(projectId);
                    await this.restart(projectId).catch(() => {});
                }
            }
        }, HEALTH_CHECK_INTERVAL);
        healthCheckTimers.set(projectId, timer);
    },

    stopHealthMonitor(projectId: string) {
        const timer = healthCheckTimers.get(projectId);
        if (timer) {
            clearInterval(timer);
            healthCheckTimers.delete(projectId);
        }
    },

    async listAll() {
        const records = await PreviewRegistry.listAll();
        return records.map((r: any) => ({ ...r, processStatus: 'UNKNOWN' }));
    },
};
