import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { QUEUE_FREE, QUEUE_PRO, redis } from '../services/queue';
import logger from '../config/logger';
import { Orchestrator } from '../services/orchestrator';
import { runWithTracing } from '../config/tracing';
import { queueWaitTimeSeconds, stuckBuildsTotal } from '../config/metrics';
import { NodeRegistry } from '../runtime/cluster/nodeRegistry';
import { FailoverManager } from '../runtime/cluster/failoverManager';
import { RedisRecovery } from '../runtime/cluster/redisRecovery';
import { PreviewOrchestrator } from '../runtime/previewOrchestrator';
import { RuntimeCleanup } from '../runtime/runtimeCleanup';
import { env } from '../config/env';
import { missionController } from '../services/mission-controller';

const orchestrator = new Orchestrator();

/**
 * CRASH RECOVERY: Scans Redis for executions that are stuck in 'executing' status
 * and attempts to resume them.
 */
const workerId = `worker-${Math.random().toString(36).substring(2, 9)}`;

// Heartbeat for Control Plane Diagnostics
setInterval(async () => {
    try {
        await redis.set(`worker:heartbeat:${workerId}`, JSON.stringify({
            status: 'online',
            lastSeen: Date.now(),
            memory: process.memoryUsage().heapUsed / 1024 / 1024, // MB
            uptime: process.uptime(),
            concurrency: {
                free: env.WORKER_CONCURRENCY_FREE || 5,
                pro: env.WORKER_CONCURRENCY_PRO || 10
            }
        }), 'EX', 30);
    } catch (e) {
        logger.warn('Failed to update worker heartbeat');
    }
}, 10000);

const resumeOrphanedExecutions = async () => {
    logger.info('Scanning for orphaned missions to resume...');
    try {
        const activeMissions = await missionController.listActiveMissions();
        
        for (const mission of activeMissions) {
            // If it's been in 'starting' or 'planning' or 'generating' too long, resume it
            // For now, any non-finalized mission found on startup is a candidate
            if (Date.now() - mission.updatedAt > 60000) { // 1 minute stale
                logger.info({ missionId: mission.id, status: mission.status }, 'Resuming orphaned mission...');
                stuckBuildsTotal.inc();

                executeBuild({
                    prompt: mission.prompt,
                    userId: mission.userId,
                    projectId: mission.projectId,
                    executionId: mission.id,
                    isFastPreview: mission.metadata.fastPath
                }).catch(err => logger.error({ err, missionId: mission.id }, 'Failed to resume orphaned mission'));
            }
        }
    } catch (err) {
        logger.error({ err }, 'Error during orphaned mission scan');
    }
};

const executeBuild = async (data: any, job?: Job) => {
    const { prompt, userId, projectId, executionId, isFastPreview } = data;
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
                await job.extendLock(job.token!, 60000);
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

    try {
        await missionController.updateMission(executionId, { status: 'starting' });
        
        return await runWithTracing(executionId, async () => {
            logger.info({ executionId, userId, projectId, tier }, 'Worker entering executeBuild loop');
            
            const result = await orchestrator.execute(
                prompt,
                userId,
                projectId,
                executionId,
                controller.signal,
                { isFastPreview }
            );

            if (result && !(result as any).success) {
                throw new Error((result as any).error || 'Build failed');
            }

            await missionController.updateMission(executionId, { status: 'completed' });
            return result;
        });

    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error({ executionId, error: msg, tier }, 'Execution failed');
        await missionController.setFailed(executionId, msg);
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
    connection: redis as any,
    concurrency: env.WORKER_CONCURRENCY_FREE || 5,
    lockDuration: 60000,
    limiter: {
        max: 2, // Process max 2 jobs per second per worker instance
        duration: 1000
    }
});

const proWorker = new Worker(QUEUE_PRO, processJob, {
    connection: redis as any,
    concurrency: env.WORKER_CONCURRENCY_PRO || 10,
    lockDuration: 60000,
    limiter: {
        max: 5,
        duration: 1000
    }
});

const setupWorkerEvents = (worker: Worker, name: string) => {
    worker.on('completed', (job) => {
        logger.info({ jobId: job.id, worker: name }, 'Job completed');
    });

    worker.on('failed', (job, err) => {
        logger.error({ jobId: job?.id, worker: name, err: err instanceof Error ? err.message : String(err) }, 'Job failed');
    });
};

setupWorkerEvents(freeWorker, 'free');
setupWorkerEvents(proWorker, 'pro');

// Worker Heartbeat Logic
const HEARTBEAT_INTERVAL = 5000;
const heartbeat = setInterval(async () => {
    try {
        const health = {
            status: 'active',
            lastSeen: Date.now(),
            freeConcurrency: freeWorker.opts.concurrency,
            proConcurrency: proWorker.opts.concurrency
        };
        await redis.set('system:health:worker', JSON.stringify(health), 'EX', 15);
    } catch (err) {
        logger.error({ err }, 'Failed to record worker heartbeat');
    }
}, HEARTBEAT_INTERVAL);

// Graceful shutdown
const shutdown = async () => {
    logger.info('Shutting down workers...');
    clearInterval(heartbeat);
    FailoverManager.stop();
    await RuntimeCleanup.shutdownAll();
    await NodeRegistry.deregister();
    await Promise.all([freeWorker.close(), proWorker.close()]);
    await redis.quit();
    process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Cluster & Instant Trigger Listeners
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
                            data.request.userId,
                            data.request.executionId
                        ).catch((err: any) => logger.error({ err, projectId: data.request.projectId } as any, 'Failed to start assigned runtime'));
                    }
                } else if (channel === 'cluster:node:restart') {
                    if (data.nodeId === nodeId) {
                        logger.warn({ reason: data.reason }, '[Worker] Received restart signal. Shutting down gracefully...');
                        await shutdown();
                    }
                }
            } catch (err: any) {
                logger.error({ err } as any, `[Worker] Error processing message on channel ${channel}`);
            }
        });

    } catch (err: any) {
        logger.error({ err } as any, 'Failed to register node in cluster (non-fatal, running in standalone mode)');
    }
})();

logger.info(`Workers started: Free (concurrency=${freeWorker.opts.concurrency}), Pro (concurrency=${proWorker.opts.concurrency})`);

// Kick off crash recovery
resumeOrphanedExecutions();

// Start background preview cleanup
RuntimeCleanup.start();

// Redis connection error handling & auto-recovery
redis.on('error', (err: any) => {
    logger.error({ err }, '[Worker] Redis connection error');
    if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
        RedisRecovery.handleRedisCrash().catch(recErr => {
            logger.error({ err: recErr }, '[Worker] Critical recovery failure');
        });
    }
});
