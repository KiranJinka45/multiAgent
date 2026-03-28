import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { logger } from '@packages/observability';
import { redis, QUEUE_DOCKER, eventBus } from '@packages/shared-services';
import { DistributedExecutionContext, SandboxPodController } from '@packages/utils/server';

const podController = new SandboxPodController();

export const dockerWorker = new Worker(QUEUE_DOCKER, async (job: Job) => {
    const { projectId, executionId } = job.data;
    logger.info({ projectId, executionId }, '[Docker Worker] Starting deployment');

    try {
        await eventBus.stage(executionId, 'deployment', 'in_progress', 'Docker Agent: Creating sandbox environment...', 90);

        const context = new DistributedExecutionContext(executionId);
        const data = await context.get();

        // 1. Deploy to Sandbox
        const deployment = await podController.deploy(projectId, executionId, (data as any)?.finalFiles || []);

        if (!deployment.success) {
            throw new Error(`Docker: Sandbox deployment failed. ${deployment.error || ''}`);
        }

        // 2. Update Context with preview URL
        await context.atomicUpdate(ctx => {
            (ctx.metadata as any).previewUrl = deployment.url;
            ctx.status = 'completed';
        });

        await eventBus.complete(executionId, deployment.url, {
            tokensTotal: (data as any)?.metadata?.tokensTotal,
            durationMs: (data as any)?.metadata?.durationMs
        }, projectId, (data as any)?.finalFiles);

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error({ error, executionId }, '[Docker Worker] Failed');
        await eventBus.error(executionId, `Docker Error: ${errorMessage}`);
        throw error;
    }
}, {
    connection: redis as unknown as Redis,
    concurrency: 2
});

logger.info('Docker Worker online');
