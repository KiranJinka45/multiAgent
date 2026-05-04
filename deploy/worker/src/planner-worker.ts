// @ts-nocheck
import { Worker, Job } from '@packages/utils';
import { redis } from '@packages/utils';
import { logger } from '@packages/observability';
import { eventBus, QUEUE_PLANNER } from '@packages/utils';
import { architectureQueue, DistributedExecutionContext } from '@packages/utils';
import { IntentDetectionAgent } from '@packages/agents';

const intentAgent = new IntentDetectionAgent();
if (!QUEUE_PLANNER) throw new Error("FATAL: QUEUE_PLANNER name must be provided");

export const plannerWorker = new Worker(QUEUE_PLANNER, async (job: Job) => {
    const { projectId, executionId, userId, prompt, strategy } = job.data;
    logger.info({ projectId, executionId }, '[Planner Worker] Started');

    try {
        await eventBus.stage(executionId, 'initializing', 'in_progress', 'Planner Agent: Analyzing user intent...', 20);

        // 1. Intent Detection (Detailed Planning)
        const intentResult = await intentAgent.execute({
            prompt,
            context: { techStack: strategy?.recommendedTechStack }
        } as any, { executionId, userId, projectId } as any);

        if (!intentResult.success) {
            throw new Error(`Planner: Failed to detect intent. ${intentResult.error || ''}`);
        }

        const intent = intentResult.data;
        logger.info({ projectId, template: intent.templateId }, '[Planner Worker] Intent detected');

        // 2. Update Context state
        const context = new DistributedExecutionContext(executionId);
        await context.atomicUpdate(ctx => {
            (ctx.metadata as any).intent = intent;
            (ctx.metadata as any).strategy = strategy || ctx.metadata.strategy;
            ctx.status = 'executing';
        });

        await eventBus.stage(executionId, 'PlannerAgent', 'in_progress', `Selected template: ${intent.templateId}`, 30);

        // 3. Hand off to Architecture stage
        await architectureQueue.add('design-architecture', {
            projectId,
            executionId,
            userId,
            prompt,
            intent,
            strategy
        });

        await eventBus.stage(executionId, 'initializing', 'completed', 'Planning complete. Architecture design started.', 30);

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error({ error, executionId }, '[Planner Worker] Failed');
        await eventBus.error(executionId, `Planner Error: ${errorMessage}`);
        throw error;
    }
}, {
    connection: redis,
    concurrency: 5
});

logger.info('Planner Worker online');


