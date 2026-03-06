import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { Worker, Job } from 'bullmq';
import { QUEUE_FREE, QUEUE_PRO } from '@queue/build-queue';
import redis from '@queue/redis-client';
import logger from '@configs/logger';
import { TaskOrchestrator } from './agents/task-orchestrator';
import { runWithTracing } from '@configs/tracing';
import { queueWaitTimeSeconds, stuckBuildsTotal } from '@configs/metrics';
import { NodeRegistry } from './runtime/cluster/nodeRegistry';
import { FailoverManager } from './runtime/cluster/failoverManager';
import { RedisRecovery } from './runtime/cluster/redisRecovery';
import { PreviewOrchestrator } from './runtime/previewOrchestrator';
import { RuntimeCleanup } from './runtime/runtimeCleanup';
import { env } from '@configs/env';

const orchestrator = new TaskOrchestrator();

/**
 * CRASH RECOVERY: Scans Redis for executions that are stuck in 'executing' status
 * and attempts to resume them.
 */
const resumeOrphanedExecutions = async () => {
    logger.info('Scanning for orphaned executions to resume...');
    try {
        const keys = await redis.keys('build:state:*');
        for (const key of keys) {
            const stateRaw = await redis.get(key);
            if (!stateRaw) continue;

            try {
                const state = JSON.parse(stateRaw);
                if (state.status === 'executing' && state.executionId) {
                    logger.info({ executionId: state.executionId }, 'Found orphaned execution. Attempting resume...');
                    stuckBuildsTotal.inc();

                    const { userId, projectId, message } = state;

                    orchestrator.run(message || 'Resuming build...', userId || 'unknown', projectId || 'unknown', state.executionId, AbortSignal.timeout(30 * 60 * 1000))
                        .catch(err => logger.error({ err, executionId: state.executionId }, 'Failed to resume orphaned execution'));
                }
            } catch (err) {
                logger.error({ err, key }, 'Failed to parse orphaned execution state');
            }
        }
    } catch (err) {
        logger.error({ err }, 'Error during orphaned execution scan');
    }
};

const processJob = async (job: Job, tier: 'free' | 'pro') => {
    const { prompt, userId, projectId, executionId } = job.data;

    // 🔒 Fix #3 — Single Job Processing Guard
    const lockKey = `build:lock:${executionId}`;
    const lock = await redis.set(lockKey, executionId, 'EX', 600, 'NX');

    if (!lock) {
        logger.warn({ executionId, jobId: job.id, tier }, 'Duplicate execution detected by lock guard. Skipping.');
        return;
    }

    const controller = new AbortController();

    // Record queue wait time
    const waitTime = (Date.now() - job.timestamp) / 1000;
    queueWaitTimeSeconds.observe({ queue_name: tier }, waitTime);

    // --- Auto-Lock-Extension Mechanism ---
    const lockExtensionInterval = setInterval(async () => {
        try {
            if (await job.isActive()) {
                await job.extendLock(job.token!, 60000);

                // 🔒 Fix #4 — Verify Execution Ownership
                const owner = await redis.get(lockKey);
                if (owner !== executionId) {
                    throw new Error('Execution lock ownership lost (Heartbeat Violation)');
                }

                const extendResult = await redis.expire(lockKey, 600);
                if (!extendResult) {
                    throw new Error('Failed to extend Redis lock (Heartbeat Violation)');
                }

                const { lockExtensionTotal } = await import('./lib/metrics');
                lockExtensionTotal.inc();
                logger.debug(
                    { jobId: job.id, executionId, tier },
                    'BullMQ and Redis locks extended'
                );
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            const { ...metrics } = await import('./lib/metrics');
            metrics.lockExpiredTotal.inc();
            logger.error(
                { jobId: job.id, executionId, error: errorMessage, tier },
                'CRITICAL: Lock heartbeat failed. Aborting execution.'
            );
            controller.abort();
        }
    }, 30000);

    try {
        return await runWithTracing(executionId, async () => {
            logger.info(
                { jobId: job.id, executionId, userId, projectId, tier },
                'Worker picked up project generation job'
            );

            const result = await orchestrator.run(
                prompt,
                userId,
                projectId,
                executionId,
                controller.signal
            );

            if (result && !(result as any).success) {
                throw new Error((result as any).error || 'Build failed');
            }

            return result;
        });

    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error({ executionId, error: msg, tier }, 'Worker job failed');
        throw error;
    } finally {
        clearInterval(lockExtensionInterval);
    }
};

// 1. Initialize Tiers
const freeWorker = new Worker(QUEUE_FREE, (job) => processJob(job, 'free'), {
    connection: redis,
    concurrency: env.WORKER_CONCURRENCY_FREE || 5,
    lockDuration: 60000
});

const proWorker = new Worker(QUEUE_PRO, (job) => processJob(job, 'pro'), {
    connection: redis,
    concurrency: env.WORKER_CONCURRENCY_PRO || 10,
    lockDuration: 60000
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

// Cluster Listeners (Schedule Assignments & Rolling Restarts)
(async () => {
    try {
        const nodeId = await NodeRegistry.register();
        logger.info({ nodeId }, 'Node registered in cluster');
        FailoverManager.start();

        const sub = redis.duplicate();
        await sub.subscribe('cluster:schedule:assign', 'cluster:node:restart');

        sub.on('message', async (channel: string, message: string) => {
            try {
                const data = JSON.parse(message);
                if (channel === 'cluster:schedule:assign') {
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
