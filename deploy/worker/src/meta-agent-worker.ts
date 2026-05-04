// @ts-nocheck
import { Worker, Job } from '@packages/utils';
import { Redis } from 'ioredis';
import { logger } from '@packages/observability';
import { redis, plannerQueue, DistributedExecutionContext } from '@packages/utils';
import { eventBus, QUEUE_META } from '@packages/utils';
import { MetaAgent } from '@packages/agents';

if (!QUEUE_META) throw new Error("FATAL: QUEUE_META name must be provided");

const metaAgent = new MetaAgent();

export const metaWorker = new Worker(QUEUE_META, async (job: Job) => {
    const { executionId, prompt, userId, projectId } = job.data;
    logger.info({ executionId, projectId }, '[Meta Worker] Analyzing project intent');

    try {
        // 1. Initial UI update
        await eventBus.stage(executionId, 'meta-analysis', 'in_progress', 'Analyzing project requirements...', 10);

        // 2. Perform high-level analysis
        const result = await metaAgent.execute({ prompt }, { executionId, userId, projectId } as any);

        if (!result.success) {
            throw new Error(result.error || 'MetaAgent analysis failed');
        }

        const strategy = result.data;
        logger.info({ projectId, executionId }, '[Meta Worker] Analysis complete');

        await eventBus.stage(executionId, 'meta-analysis', 'completed', 'Analysis complete. Recommended stack identified.', 15);

        // 3. Hand off to Planner stage
        await plannerQueue.add('plan-project', {
            projectId,
            executionId,
            userId,
            prompt,
            strategy
        });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error({ error, executionId }, '[Meta Worker] Failed');
        await eventBus.error(executionId, `Meta-Agent Error: ${errorMessage}`);
        throw error;
    }
}, {
    connection: redis,
    concurrency: 5
});

logger.info('Meta Worker online');


