import 'dotenv/config';

import { Worker, Job } from 'bullmq';
import { QUEUE_GENERATOR, validatorQueue } from '../lib/queue/agent-queues';
import redis from '../shared/services/queue/redis-client';
import logger from '../config/logger';
import { PlannerAgent } from '../agents/planner-agent';
import { TaskGraph, TaskExecutor } from '../api-gateway/services/task-engine';
import { agentRegistry } from '../api-gateway/services/task-engine/agent-registry';
import { DatabaseAgent } from '../agents/database-agent';
import { BackendAgent } from '../agents/backend-agent';
import { FrontendAgent } from '../agents/frontend-agent';
import { VirtualFileSystem, CommitManager } from '../api-gateway/services/vfs';
import { eventBus } from '../shared/services/event-bus';
import { DistributedExecutionContext } from '../api-gateway/services/execution-context';
import path from 'path';
import fs from 'fs';

// Re-register agents for the worker context
agentRegistry.register('DatabaseAgent', new DatabaseAgent());
agentRegistry.register('BackendAgent', new BackendAgent());
agentRegistry.register('FrontendAgent', new FrontendAgent());

const plannerAgent = new PlannerAgent();
const taskExecutor = new TaskExecutor();

const logPath = path.join(process.cwd(), 'generator_worker.log');
const log = (msg: string) => {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${timestamp}] ${msg}\n`);
};

const generatorWorker = new Worker(QUEUE_GENERATOR, async (job: Job) => {
    const { projectId, executionId, userId, prompt, intent, strategy } = job.data;
    const sandboxDir = path.join(process.cwd(), '.generated-projects', projectId);
    log(`[Generator] Job received for ${executionId}`);
    logger.info({ projectId, executionId }, '[Generator Worker] Started Code Generation');

    try {
        await eventBus.stage(executionId, 'backend', 'in_progress', 'Generator Agent: Planning deep task graph...', 45);

        // 1. Task Planning (Deep)
        const planResult = await plannerAgent.execute({ prompt }, {} as any);
        if (!planResult.success || !planResult.data) {
            throw new Error('Generator: Failed to generate deep task graph');
        }
        const plan = planResult.data;

        // 2. Build Task Graph
        const graph = new TaskGraph();
        for (const step of plan.steps) {
            graph.addTask({
                id: String(step.id),
                type: step.agent,
                title: step.title,
                description: step.description,
                dependsOn: step.dependencies.map(String),
                payload: { prompt, schema: '', allFiles: [] }
            });
        }

        // 3. Parallel Execution
        const context = new DistributedExecutionContext(executionId);
        await context.sync(); // Hydrate project info
        await taskExecutor.evaluateGraph(graph, context);

        // 4. Collect & Commit Files
        const finalData = await context.get();
        const allFiles: { path: string; content: string }[] = [];
        ['DatabaseAgent', 'BackendAgent', 'FrontendAgent'].forEach(agentName => {
            const res = finalData?.agentResults?.[agentName]?.data as any;
            if (res?.files) allFiles.push(...res.files);
        });

        const vfs = new VirtualFileSystem();
        vfs.loadFromDiskState(allFiles);
        await CommitManager.commit(vfs, sandboxDir);

        await context.atomicUpdate(ctx => {
            (ctx as any).finalFiles = allFiles;
            (ctx as any).status = 'executing';
        });

        await eventBus.agent(executionId, 'GeneratorAgent', 'code_generated', `Generated ${allFiles.length} files dynamically.`);

        // 5. Hand off to Validator stage
        await validatorQueue.add('verify-build', {
            projectId,
            executionId,
            userId,
            prompt,
            intent,
            strategy
        });

        await eventBus.stage(executionId, 'backend', 'completed', 'Backend code generation complete.', 60);
        await eventBus.stage(executionId, 'frontend', 'completed', 'Frontend code generation complete.', 70);

        const mem = process.memoryUsage();
        const memMb = Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100;
        log(`[Generator] Memory usage: ${memMb} MB (Heap Used)`);
        logger.info({ executionId, memoryMb: memMb }, '[Generator Worker] Memory Usage');

    } catch (error: any) {
        log(`[Generator] ERROR: ${error.message}`);
        logger.error({ error, executionId }, '[Generator Worker] Failed');
        await eventBus.error(executionId, `Generator Error: ${error.message}`);
        throw error;
    }
}, {
    connection: redis as any,
    concurrency: 5
});

log(`Generator Worker online. Redis: ${(redis as any).options.port}`);
logger.info('Generator Worker online');

setInterval(() => {
    const mem = process.memoryUsage();
    const memMb = Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100;
    log(`Heartbeat... Memory: ${memMb} MB`);
}, 30000);

new Promise(() => { });

