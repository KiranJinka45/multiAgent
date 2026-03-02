import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { Worker, Job } from 'bullmq';
import { QUEUE_NAME } from './lib/queue';
import redis from './lib/redis';
import logger from './lib/logger';
import { Orchestrator } from './agents/orchestrator';
import { runWithTracing } from './lib/tracing';
import { queueWaitTimeSeconds } from './lib/metrics';
import { NodeRegistry } from './runtime/cluster/nodeRegistry';
import { FailoverManager } from './runtime/cluster/failoverManager';
import { RedisRecovery } from './runtime/cluster/redisRecovery';
import { PreviewOrchestrator } from './runtime/previewOrchestrator';

// Create BullMQ Worker
const worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
        const { prompt, userId, projectId, executionId } = job.data;

        // 🔒 Fix #3 — Single Job Processing Guard
        const lockKey = `build:lock:${executionId}`;
        const lock = await redis.set(lockKey, executionId, 'EX', 600, 'NX');

        if (!lock) {
            logger.warn({ executionId, jobId: job.id }, 'Duplicate execution detected by lock guard. Skipping.');
            return;
        }

        // ✅ Create orchestrator lazily per job
        const orchestrator = new Orchestrator();
        const controller = new AbortController();

        // Record queue wait time
        const waitTime = (Date.now() - job.timestamp) / 1000;
        queueWaitTimeSeconds.observe(waitTime);

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
                        { jobId: job.id, executionId },
                        'BullMQ and Redis locks extended'
                    );
                }
            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                const { ...metrics } = await import('./lib/metrics');
                metrics.lockExpiredTotal.inc();
                logger.error(
                    { jobId: job.id, executionId, error: errorMessage },
                    'CRITICAL: Lock heartbeat failed. Aborting execution.'
                );
                controller.abort(); // 🧨 Hardcore Fix #7 — Abort on lock loss
            }
        }, 30000);

        try {
            return await runWithTracing(executionId, async () => {
                logger.info(
                    {
                        jobId: job.id,
                        executionId,
                        userId,
                        projectId
                    },
                    'Worker picked up project generation job'
                );

                const result = await orchestrator.run(
                    prompt,
                    userId,
                    projectId,
                    executionId,
                    controller.signal
                );

                if (result && !result.success) {
                    throw new Error(result.error);
                }

                logger.info(
                    { executionId },
                    'Worker successfully completed job'
                );

                return result;
            });

        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            logger.error(
                { executionId, error: msg },
                'Worker job failed'
            );
            throw error;

        } finally {
            clearInterval(lockExtensionInterval);
        }
    },
    {
        connection: redis,
        concurrency: Number(process.env.WORKER_CONCURRENCY) || 5,
        lockDuration: 60000
    }
);

// Event listeners
worker.on('completed', (_job) => {
    logger.info({ jobId: _job.id }, 'Job completed');
});

worker.on('failed', (_job, err) => {
    logger.error({ jobId: _job?.id, err: err instanceof Error ? err.message : String(err) }, 'Job failed');
});

// ─── Phase 4: Redis Crash Recovery ──────────────────────────────
redis.on('error', async (err: any) => {
    if (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET') {
        logger.error({ err }, '[Worker] Redis connection lost. Triggering recovery flow...');
        await RedisRecovery.handleRedisCrash().catch(recErr => {
            logger.error({ err: recErr }, '[Worker] Critical recovery failure');
        });
    }
});

// Worker Heartbeat Logic
const HEARTBEAT_INTERVAL = 5000;

const heartbeat = setInterval(async () => {
    try {
        await redis.set(
            'system:health:worker',
            JSON.stringify({
                status: 'active',
                lastSeen: Date.now(),
                concurrency: worker.opts.concurrency
            }),
            'EX',
            15
        );
    } catch (err) {
        logger.error({ err }, 'Failed to record worker heartbeat');
    }
}, HEARTBEAT_INTERVAL);

// Graceful shutdown
const shutdown = async () => {
    logger.info('Shutting down worker...');
    clearInterval(heartbeat);
    await worker.close();
    process.exit(0);
};


// Phase 3 & 4: Cluster Listeners (Schedule Assignments & Rolling Restarts)
(async () => {
    try {
        const nodeId = await NodeRegistry.register();
        logger.info({ nodeId }, 'Node registered in cluster');
        FailoverManager.start();

        // 1. Listen for cluster events
        const sub = redis.duplicate();
        await sub.connect();

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

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

logger.info(
    `Worker for queue "${QUEUE_NAME}" started with concurrency ${worker.opts.concurrency}`
);

// Phase 3 & 4: Cluster Listeners (Schedule Assignments & Rolling Restarts)
(async () => {
    try {
        const nodeId = await NodeRegistry.register();
        logger.info({ nodeId }, 'Node registered in cluster');
        FailoverManager.start();

        // 1. Listen for cluster events
        const sub = redis.duplicate();
        await sub.connect();

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