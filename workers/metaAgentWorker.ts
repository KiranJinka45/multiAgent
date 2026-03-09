import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { Worker, Job } from 'bullmq';
import { QUEUE_META, plannerQueue } from '../src/lib/queue/agent-queues';
import redis from '@queue/redis-client';
import logger from '@configs/logger';
import { MetaAgent } from '../services/meta-agent';
import { DistributedExecutionContext } from '../services/execution-context';
import { eventBus } from '@configs/event-bus';

const metaAgent = new MetaAgent();

const metaWorker = new Worker(QUEUE_META, async (job: Job) => {
    const { executionId, prompt, userId, projectId } = job.data;
    logger.info({ executionId, projectId }, '[Meta Worker] Analyzing project intent');

    try {
        const context = new DistributedExecutionContext(executionId);

        // 1. Initial UI update
        await eventBus.stage(executionId, 'initializing', 'in_progress', 'Meta-Agent: Decomposing high-level requirements...', 10);

        // 2. Perform high-level analysis
        const analysisResult = await metaAgent.execute({ prompt });

        if (!analysisResult.success) {
            throw new Error(analysisResult.error || 'MetaAgent analysis failed');
        }

        const strategy = analysisResult.data;

        // 3. Update DistributedExecutionContext with the strategy
        await context.atomicUpdate(ctx => {
            ctx.metadata.strategy = strategy;
            ctx.metadata.intent = strategy.intent;
            ctx.metadata.complexity = strategy.complexity;
            ctx.metadata.requiredAgents = strategy.requiredAgents;
        });

        await eventBus.agent(executionId, 'MetaAgent', 'analyzed', `Intent: ${strategy.intent}. Complexity: ${strategy.complexity}. Dispatched.`);

        // 4. Enqueue to Planner stage with enriched metadata
        await plannerQueue.add('plan-with-strategy', {
            executionId,
            projectId,
            userId,
            prompt,
            strategy
        }, {
            priority: strategy.priority || 5
        });

    } catch (err: any) {
        logger.error({ err, executionId }, '[Meta Worker] Analysis failed');
        await eventBus.error(executionId, `Meta-Agent Error: ${err.message}`);
        throw err;
    }
}, {
    connection: redis,
    concurrency: 5
});

logger.info('Meta-Agent Worker online');
