import 'dotenv/config';
import { startTracing } from '@libs/observability/tracing';
startTracing();

import fs from 'fs-extra';
import path from 'path';
import * as dotenv from 'dotenv';
import { Worker, Job } from 'bullmq';
import { QUEUE_FREE, QUEUE_PRO } from '@libs/utils/services/build-queue';
import { redis } from '@libs/utils/services/redis';
import logger from '@libs/utils/config/logger';
import { Orchestrator } from '../orchestrator/orchestrator';
import { runWithTracing } from '@libs/utils/config/tracing';
import { JobStage } from '@libs/contracts/pipeline-types';
import { ArtifactValidator } from '@libs/validator/artifact-validator';

// Manual .env.local load to match system-startup.ts behavior
const envLocal = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocal)) {
  dotenv.config({ path: envLocal, override: true });
}
import { queueWaitTimeSeconds, stuckBuildsTotal } from '@libs/utils/config/metrics';
import { NodeRegistry } from '../sandbox-runtime/cluster/nodeRegistry';
import { FailoverManager } from '../sandbox-runtime/cluster/failoverManager';
import { RedisRecovery } from '../sandbox-runtime/cluster/redisRecovery';
import { PreviewOrchestrator } from '../sandbox-runtime/previewOrchestrator';
import { RuntimeCleanup } from '../sandbox-runtime/runtimeCleanup';
import { env } from '@libs/utils/config/env';
import { missionController } from '@libs/utils/services/mission-controller';
import { eventBus } from '@libs/utils/services/event-bus';
import { ReliabilityMonitor } from '../api/services/reliability-monitor';
import { BuildCacheManager } from '@libs/build-engine/build-cache-manager';
import { WorkerClusterManager } from '@libs/utils/services/worker-cluster-manager';
import { BuildGraphEngine } from '@libs/build-engine/build-graph-engine';
import os from 'os';

const WORKER_ID = `worker-${os.hostname()}-${process.pid}`;
const orchestrator = new Orchestrator();

/**
 * CRASH RECOVERY: Scans Redis for executions that are stuck in 'executing' status
 * and attempts to resume them.
 */
const workerId = `worker-${Math.random().toString(36).substring(2, 9)}`;

// Heartbeat for Control Plane Diagnostics
const HEARTBEAT_INTERVAL = 5000;
setInterval(async () => {
    try {
        const heartbeat = {
            status: 'online',
            lastSeen: Date.now(),
            memory: process.memoryUsage().heapUsed / 1024 / 1024, // MB
            uptime: process.uptime(),
            workerId
        };

        // Unique key for individual worker tracking
        await redis.set(`worker:heartbeat:${workerId}`, JSON.stringify(heartbeat), 'EX', 15);
        // Standard key for global diagnostics heartbeat
        await redis.set('system:health:worker', JSON.stringify(heartbeat), 'EX', 15);
    } catch {
        logger.warn('Failed to update worker heartbeat');
    }
}, HEARTBEAT_INTERVAL);

const RECOVERY_STALE_MS = 60000;
const resumeOrphanedExecutions = async () => {
    logger.info('Scanning for orphaned missions to resume...');
    try {
        const activeMissions = await missionController.listActiveMissions();
        const activeHeartbeatKeys = await redis.keys('worker:heartbeat:*');
        const activeWorkerIds = new Set(activeHeartbeatKeys.map(k => k.split(':').pop()));
        
        for (const mission of activeMissions) {
            const missionWorkerId = mission.metadata?.workerId;
            const isStale = Date.now() - mission.updatedAt > RECOVERY_STALE_MS;
            const isOwnerDead = missionWorkerId && !activeWorkerIds.has(missionWorkerId as string);

            if (isStale || isOwnerDead) {
                logger.info({ 
                    missionId: mission.id, 
                    status: mission.status,
                    isStale,
                    isOwnerDead 
                }, 'Resuming orphaned mission...');
                stuckBuildsTotal.inc();

                executeBuild({
                    prompt: mission.prompt,
                    userId: mission.userId,
                    projectId: mission.projectId,
                    executionId: mission.id,
                    isFastPreview: !!mission.metadata?.fastPath
                }).catch(err => logger.error({ err, missionId: mission.id }, 'Failed to resume orphaned mission'));
            }
        }
    } catch (err) {
        logger.error({ err }, 'Error during orphaned mission scan');
    }
};

// Set periodic recovery
setInterval(resumeOrphanedExecutions, 60_000);

const executeBuild = async (data: { prompt: string, userId: string, projectId: string, executionId: string, tenantId?: string, isFastPreview?: boolean }, job?: Job) => {
    const { prompt, userId, projectId, executionId, tenantId, isFastPreview } = data;
    const tier = job ? (job.queueName.includes('pro') ? 'pro' : 'free') : 'instant';

    // 🔒 Single Job Processing Guard (Shared between Queue & Instant Trigger)
    const lockKey = `build:lock:${executionId}`;
    const lock = await redis.set(lockKey, executionId, 'EX', 600, 'NX');

    if (!lock) {
        if (job) logger.warn({ executionId, jobId: job.id, tier }, 'Duplicate execution (Queue) detected. Skipping.');
        return;
    }

    const controller = new AbortController();

    // Record queue wait time if it's a job
    if (job) {
        const waitTime = (Date.now() - job.timestamp) / 1000;
        queueWaitTimeSeconds.observe({ queue_name: tier }, waitTime);
    }

    // --- Auto-Lock-Extension Mechanism ---
    const lockExtensionInterval = setInterval(async () => {
        try {
            // Extend BullMQ lock if job exists
            if (job && await job.isActive()) {
                // Increased extension to 5 minutes for safety during heavy builds
                await job.extendLock(job.token!, 300000);
            }

            // Verify execution ownership in Redis
            const owner = await redis.get(lockKey);
            if (owner !== executionId) {
                throw new Error('Execution lock ownership lost (Heartbeat Violation)');
            }

            // Extend Redis lock
            await redis.expire(lockKey, 600);

            logger.debug({ executionId, tier }, 'Execution locks extended (Heartbeat)');
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            logger.error({ executionId, error: errorMessage, tier }, 'CRITICAL: Lock heartbeat failed. Aborting.');
            controller.abort();
        }
    }, 30000);

    const startTime = Date.now();
    try {
        await missionController.updateMission(executionId, { 
            status: 'planning',
            metadata: { workerId } 
        });
        
        // --- BUILD TIMEOUT GUARD (Fix 9) ---
        const BUILD_TIMEOUT_MS = 15 * 60 * 1000; // 15 Minutes
        const timeout = setTimeout(() => {
            logger.error({ executionId }, '[Worker] Build timeout reached. Aborting.');
            controller.abort();
        }, BUILD_TIMEOUT_MS);
        // ------------------------------------

        return await runWithTracing(executionId, async () => {
            logger.info({ executionId, userId, projectId, tier }, 'Worker entering executeBuild loop');
            
            const sandboxDir = path.join(process.cwd(), '.generated-projects', projectId);
            await fs.ensureDir(sandboxDir);

            // --- CACHE RESTORATION PHASE ---
            const cacheRestored = await BuildCacheManager.restore(projectId, sandboxDir);
            if (cacheRestored) {
                logger.info({ projectId }, '[Worker] Incremental build: Cache restored successfully');
                await eventBus.stage(executionId, JobStage.PLAN.toLowerCase(), 'completed', 'Incremental build: Restored previous build cache', 20, projectId);
                
                // --- GRAPH ANALYSIS PHASE ---
                const affectedNodes = await BuildGraphEngine.getAffectedNodes(sandboxDir);
                if (affectedNodes.length === 0) {
                    logger.info({ projectId }, '[Worker] Zero affected nodes. Skipping full build.');
                    await eventBus.stage(executionId, JobStage.PLAN.toLowerCase(), 'completed', 'No changes detected. Reusing existing artifacts.', 30, projectId);
                    // We could return early here if the system supports artifact injection only
                } else {
                    logger.info({ projectId, count: affectedNodes.length }, '[Worker] Partial changes detected');
                }
            }
            
            try {
                const result = await orchestrator.run(
                    prompt,
                    userId,
                    projectId,
                    executionId,
                    tenantId || 'default',
                    controller.signal,
                    { isFastPreview }
                );
                
                clearTimeout(timeout); // Success - clear timeout

                if (result && !result.success) {
                    const errorResult = result as { error: string };
                    throw new Error(errorResult.error || 'Build failed');
                }

            // 🛡️ FINAL INTEGRITY WATCHDOG
            const validationResult = await ArtifactValidator.validate(projectId);
            if (!validationResult.valid) {
                const error = `Build integrity failure: Missing ${validationResult.missingFiles?.join(', ') || 'critical files'}`;
                logger.error({ projectId, missing: validationResult.missingFiles }, '[Worker] Integrity Check FAILED');
                throw new Error(error);
            }
            logger.info({ projectId }, '[Worker] Integrity Check PASSED');

            // --- CACHE SAVE PHASE ---
            await BuildCacheManager.save(projectId, sandboxDir);

            await missionController.updateMission(executionId, { status: 'complete' });


            const durationMs = Date.now() - startTime;
            await ReliabilityMonitor.recordSuccess(durationMs);

                return result;
            } catch (err) {
                clearTimeout(timeout);
                throw err;
            }
        });

    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error({ executionId, error: msg, tier }, 'Execution failed');
        await missionController.updateMission(executionId, { 
            status: 'failed',
            metadata: { error: msg }
        });

        await eventBus.stage(executionId, JobStage.FAILED.toLowerCase(), 'failed', `Build failed: ${msg}`, 100, projectId);
        await eventBus.error(executionId, `[BuildWorker] ${msg}`, projectId);
        await ReliabilityMonitor.recordFailure();
        
        throw error;
    } finally {
        clearInterval(lockExtensionInterval);
    }
};

const processJob = async (job: Job) => {
    return await executeBuild(job.data, job);
};

// 1. Initialize Tiers
const freeWorker = new Worker(QUEUE_FREE, processJob, {
    connection: redis as unknown as any,
    concurrency: Number(env.WORKER_CONCURRENCY_FREE) || 5,
    lockDuration: 300000, 
    limiter: {
        max: 5, 
        duration: 1000
    }
});

const proWorker = new Worker(QUEUE_PRO, processJob, {
    connection: redis as unknown as any,
    concurrency: Number(env.WORKER_CONCURRENCY_PRO) || 20,
    lockDuration: 300000, 
    limiter: {
        max: 10,
        duration: 1000
    }
});

const setupWorkerEvents = (worker: Worker, name: string) => {
    worker.on('completed', (job: Job) => {
        logger.info({ jobId: job.id, worker: name }, 'Job completed');
    });

    worker.on('failed', (job: Job | undefined, err: Error) => {
        logger.error({ jobId: job?.id, worker: name, err: err.message }, 'Job failed');
    });
};

setupWorkerEvents(freeWorker, 'free');
setupWorkerEvents(proWorker, 'pro');

// Graceful shutdown
const shutdown = async () => {
    logger.info('Shutting down workers...');
    FailoverManager.stop();
    await RuntimeCleanup.shutdownAll();
    await NodeRegistry.deregister();
    await Promise.all([freeWorker.close(), proWorker.close()]);
    await redis.quit();
    process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// 🔥 START CLUSTER HEARTBEAT
setInterval(async () => {
    try {
        await WorkerClusterManager.heartbeat({
            workerId: WORKER_ID,
            hostname: os.hostname(),
            load: 0, // In production, we'd calculate CPU/Mem load here
            status: 'IDLE' // Update dynamically based on job state
        });
    } catch (err) {
        console.error('[Worker] Heartbeat failed:', err);
    }
}, 2000);

// Cluster & Instant Trigger Listeners
(async () => {
    try {
        const sub = redis.duplicate();
        // ioredis handles connection automatically
        
        logger.info({ workerId: WORKER_ID }, '[Worker] Subscribing to direct steering channel');
        
        await sub.subscribe(`worker:trigger:${WORKER_ID}`);
        sub.on('message', async (channel, message) => {
            if (channel === `worker:trigger:${WORKER_ID}`) {
                try {
                    const { projectId } = JSON.parse(message);
                    logger.info({ projectId }, '[Worker] Direct job steering received! Triggering execution.');
                } catch (pErr) {
                    logger.error({ err: pErr }, '[Worker] Failed to parse steering message');
                }
            }
        });
    } catch (err) {
        const error = err as Error;
        logger.error({ err: error.message }, '[Worker] Direct steering listener failed');
    }
})();

(async () => {
    try {
        const nodeId = await NodeRegistry.register();
        logger.info({ nodeId }, 'Node registered in cluster');
        FailoverManager.start();

        const sub = redis.duplicate();
        await sub.subscribe('cluster:schedule:assign', 'cluster:node:restart', 'build:init:trigger');

        sub.on('message', async (channel: string, message: string) => {
            try {
                const data = JSON.parse(message);

                if (channel === 'build:init:trigger') {
                    logger.info({ executionId: data.executionId }, '⚡ Instant Trigger received. Initiating build...');
                    // Fire and forget so we don't block the sub loop
                    executeBuild(data).catch(err => logger.error({ err, executionId: data.executionId }, 'Instant Trigger execution failed'));
                } else if (channel === 'cluster:schedule:assign') {
                    if (data.targetNodeId === nodeId) {
                        logger.info({ projectId: data.request.projectId }, '[Worker] Picking up assigned runtime');
                        PreviewOrchestrator.start(
                            data.request.projectId,
                            data.request.executionId,
                            data.request.userId
                        ).catch((err: unknown) => {
                            const error = err instanceof Error ? err.message : String(err);
                            logger.error({ err: error, projectId: data.request.projectId }, 'Failed to start assigned runtime');
                        });
                    }
                } else if (channel === 'cluster:node:restart') {
                    if (data.nodeId === nodeId) {
                        logger.warn({ reason: data.reason }, '[Worker] Received restart signal. Shutting down gracefully...');
                        await shutdown();
                    }
                }
            } catch (err: unknown) {
                const errMsg = err instanceof Error ? err.message : String(err);
                logger.error({ error: errMsg }, `[Worker] Error processing message on channel ${channel}`);
            }
        });

    } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        logger.error({ error: errMsg }, 'Failed to register node in cluster (non-fatal, running in standalone mode)');
    }
})();

logger.info(`Workers started: Free (concurrency=${freeWorker.opts.concurrency}), Pro (concurrency=${proWorker.opts.concurrency})`);

// Error Handling and Recovery
process.on('unhandledRejection', (reason, promise) => {
    console.error('[Worker] Unhandled Rejection at:', promise, 'reason:', reason);
    if (process.env.NODE_ENV === "production") {
        console.log('[Worker] Attempting restart in 5s...');
        setTimeout(shutdown, 5000); // Use shutdown for graceful exit before restart
    } else {
        console.error("Worker crashed. Fix error before restart.");
        process.exit(1);
    }
});

process.on('uncaughtException', (error) => {
    console.error('[Worker] Uncaught Exception:', error);
    if (process.env.NODE_ENV === "production") {
        console.log('[Worker] Attempting restart in 5s...');
        setTimeout(shutdown, 5000); // Use shutdown for graceful exit before restart
    } else {
        console.error("Worker crashed. Fix error before restart.");
        process.exit(1);
    }
});

// Kick off crash recovery
resumeOrphanedExecutions();

// Start background preview cleanup
RuntimeCleanup.start();

// Redis connection error handling & auto-recovery
redis.on('error', (err: Error) => {
    logger.error({ err: err.message }, '[Worker] Redis connection error');
    if ((err as any).code === 'ECONNREFUSED' || (err as any).code === 'ETIMEDOUT') {
        RedisRecovery.handleRedisCrash().catch(recErr => {
            logger.error({ err: recErr.message }, '[Worker] Critical recovery failure');
        });
    }
});
