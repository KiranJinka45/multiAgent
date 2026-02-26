import { env } from './config/env';

console.log("Worker environment loaded successfully");

import { Worker, Job } from 'bullmq';
import { QUEUE_NAME } from './lib/queue';
import redis from './lib/redis';
import logger from './lib/logger';
import { Orchestrator } from './agents/orchestrator';
import { runWithTracing } from './lib/tracing';
import { queueWaitTimeSeconds } from './lib/metrics';

const orchestrator = new Orchestrator();

const worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
        const { prompt, userId, projectId, executionId } = job.data;

        // Record queue wait time
        const waitTime = (Date.now() - job.timestamp) / 1000;
        queueWaitTimeSeconds.observe(waitTime);

        // --- Auto-Lock-Extension Mechanism ---
        // Lock is 60s, we extend every 30s to be safe
        const lockExtensionInterval = setInterval(async () => {
            try {
                if (await job.isActive()) {
                    await job.extendLock(job.token!, 60000);
                    const { lockExtensionTotal } = await import('./lib/metrics');
                    lockExtensionTotal.inc();
                    logger.debug({ jobId: job.id, executionId }, 'BullMQ Lock extended');
                }
            } catch (err) {
                const { lockExpiredTotal } = await import('./lib/metrics');
                lockExpiredTotal.inc();
                logger.error({ jobId: job.id, executionId, err }, 'Failed to extend BullMQ lock - Lock may have expired');
            }
        }, 30000);

        try {
            return await runWithTracing(executionId, async () => {
                logger.info({
                    jobId: job.id,
                    executionId,
                    userId,
                    projectId
                }, 'Worker picked up project generation job');

                const result = await orchestrator.run(prompt, userId, projectId, executionId);

                if (!result.success) {
                    throw new Error(result.error);
                }

                logger.info({ executionId }, 'Worker successfully completed job');
                return result;
            });
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            logger.error({ executionId, error: msg }, 'Worker job failed');
            throw error; // Re-throw to trigger BullMQ retry
        } finally {
            clearInterval(lockExtensionInterval);
        }
    },
    {
        connection: redis,
        concurrency: Number(process.env.WORKER_CONCURRENCY) || 5,
        lockDuration: 60000, // 1 minute
    }
);

worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Job completed');
});

worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Job failed');
});

// Worker Heartbeat Logic
const HEARTBEAT_INTERVAL = 5000;
const heartbeat = setInterval(async () => {
    try {
        await redis.set('system:health:worker', JSON.stringify({
            status: 'active',
            lastSeen: Date.now(),
            concurrency: worker.opts.concurrency
        }), 'EX', 15); // Expire after 15s
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

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

logger.info(`Worker for queue "${QUEUE_NAME}" started with concurrency ${worker.opts.concurrency}`);
