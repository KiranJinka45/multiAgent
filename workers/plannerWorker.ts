import 'dotenv/config';

import { Worker, Job } from 'bullmq';
import { QUEUE_PLANNER, architectureQueue } from '../lib/queue/agent-queues';
import redis from '../services/queue/redis-client';
import logger from '../config/logger';
import { IntentDetectionAgent } from '../agents/intent-agent';
import { eventBus } from '../services/event-bus';
import { DistributedExecutionContext } from '../services/execution-context';

const intentAgent = new IntentDetectionAgent();

const plannerWorker = new Worker(QUEUE_PLANNER, async (job: Job) => {
    const { projectId, executionId, userId, prompt, strategy } = job.data;
    logger.info({ projectId, executionId }, '[Planner Worker] Started');

    try {
        await eventBus.stage(executionId, 'initializing', 'in_progress', 'Planner Agent: Analyzing user intent...', 20);

        // 1. Intent Detection (Detailed Planning)
        // We pass the recommended tech stack from Meta-Agent to the Intent Agent
        const intentResult = await intentAgent.execute({
            prompt,
            techStack: strategy?.recommendedTechStack
        }, {} as any);

        if (!intentResult.success) {
            throw new Error(`Planner: Failed to detect intent. ${intentResult.error || ''}`);
        }

        const intent = intentResult.data;
        logger.info({ projectId, template: intent.templateId }, '[Planner Worker] Intent detected');

        // 2. Update Context state
        const context = new DistributedExecutionContext(executionId);
        await context.atomicUpdate(ctx => {
            ctx.metadata.intent = intent;
            ctx.metadata.strategy = strategy || ctx.metadata.strategy;
            ctx.status = 'executing';
        });

        await eventBus.agent(executionId, 'PlannerAgent', 'intent_detected', `Selected template: ${intent.templateId}`);

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

    } catch (error: any) {
        logger.error({ error, executionId }, '[Planner Worker] Failed');
        await eventBus.error(executionId, `Planner Error: ${error.message}`);
        throw error;
    }
}, {
    connection: redis as any,
    concurrency: 5
});

logger.info('Planner Worker online');

