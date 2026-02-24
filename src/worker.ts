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

        return await runWithTracing(executionId, async () => {
            logger.info({
                jobId: job.id,
                executionId,
                userId,
                projectId
            }, 'Worker picked up project generation job');

            try {
                const result = await orchestrator.run(prompt, userId, projectId, executionId);

                if (!result.success) {
                    throw new Error(result.error);
                }

                logger.info({ executionId }, 'Worker successfully completed job');
                return result;
            } catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                logger.error({ executionId, error: msg }, 'Worker job failed');
                throw error; // Re-throw to trigger BullMQ retry
            }
        });
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

// Graceful shutdown
const shutdown = async () => {
    logger.info('Shutting down worker...');
    await worker.close();
    process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

logger.info(`Worker for queue "${QUEUE_NAME}" started with concurrency ${worker.opts.concurrency}`);
