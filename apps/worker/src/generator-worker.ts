// @ts-nocheck
import { Worker, Job } from '@packages/utils';
import { redis } from '@packages/utils';
import { logger } from '@packages/observability';
import { eventBus, QUEUE_GENERATOR } from '@packages/utils';
import { 
    validatorQueue, 
    BlueprintManager, 
    VirtualFileSystem, 
    CommitManager, 
    DistributedExecutionContext 
} from '@packages/utils';
import { GeneratorAgent } from '@packages/agents';

const generatorAgent = new GeneratorAgent();
const blueprintManager = new BlueprintManager();
if (!QUEUE_GENERATOR) throw new Error("FATAL: QUEUE_GENERATOR name must be provided");

export const generatorWorker = new Worker(QUEUE_GENERATOR, async (job: Job) => {
    const { projectId, executionId, userId, prompt, intent, strategy } = job.data;
    logger.info({ projectId, executionId }, '[Generator Worker] Generating codebase');

    try {
        await eventBus.stage(executionId, 'generating', 'in_progress', 'Generator Agent: Creating file blueprints...', 45);

        // 1. Load Blueprints
        const blueprints = await blueprintManager.getForTemplate(intent.templateId);

        // 2. Generate Code
        const result = await generatorAgent.execute({
            prompt,
            blueprints,
            techStack: strategy?.recommendedTechStack
        }, { executionId, userId, projectId } as any);

        if (!result.success) {
            throw new Error(`Generator: Failed to generate files. ${result.error || ''}`);
        }

        const files = result.data.files;
        const vfs = new VirtualFileSystem();
        vfs.loadFromDiskState(files);

        // 3. Update Context
        const context = new DistributedExecutionContext(executionId);
        await context.atomicUpdate(ctx => {
            (ctx as any).finalFiles = files;
            ctx.status = 'executing';
        });

        await eventBus.stage(executionId, 'generating', 'completed', `Generated ${files.length} files. Starting verification...`, 70);

        // 4. Hand off to Validator stage
        await validatorQueue.add('validate-build', {
            projectId,
            executionId,
            userId,
            prompt,
            strategy
        });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error({ error, executionId }, '[Generator Worker] Failed');
        await eventBus.error(executionId, `Generator Error: ${errorMessage}`);
        throw error;
    }
}, {
    connection: redis,
    concurrency: 3
});

logger.info('Generator Worker online');


