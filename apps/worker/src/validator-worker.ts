import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { logger } from '@libs/observability';
import { redis, eventBus, QUEUE_VALIDATE } from '@libs/shared-services';
import { 
    dockerQueue, 
    repairQueue, 
    patchVerifier, 
    VirtualFileSystem, 
    DistributedExecutionContext 
} from '@libs/utils/server';
import path from 'path';
import fs from 'fs';

const logPath = path.join(process.cwd(), 'validator_direct.log');
const log = (msg: string) => fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);

export const validatorWorker = new Worker(QUEUE_VALIDATE, async (job: Job) => {
    const { projectId, executionId, prompt, strategy } = job.data;
    log(`[Validator] Job received for ${executionId}`);
    const sandboxDir = path.join(process.cwd(), '.generated-projects', projectId);
    logger.info({ projectId, executionId }, '[Validator Worker] Started Verification');

    try {
        await eventBus.stage(executionId, 'testing', 'in_progress', 'Validator Agent: Running type checks...', 75);

        const context = new DistributedExecutionContext(executionId);
        const data = await context.get();
        const allFiles = (data as any)?.finalFiles || [];

        const vfs = new VirtualFileSystem();
        vfs.loadFromDiskState(allFiles);

        log(`[Validator] Running verifier on ${sandboxDir}`);
        const verification = await patchVerifier.verify(sandboxDir, vfs);

        if (verification.passed) {
            log(`[Validator] PASSED`);
            await eventBus.stage(executionId, 'ValidatorAgent', 'completed', 'Build verification passed ✅', 100);

            // Hand off to Docker stage
            await dockerQueue.add('build-container', {
                projectId,
                executionId,
                prompt,
                strategy
            });
            await eventBus.stage(executionId, 'testing', 'completed', 'Verification complete.', 85);
        } else {
            log(`[Validator] FAILED with ${verification.errors?.length} errors: ${verification.errors?.join(' | ')}`);
            log(`Triggering Repair.`);

            // Set failure context so RepairAgent knows the error
            await context.atomicUpdate(ctx => {
                ctx.status = 'executing';
                if (!ctx.agentResults) ctx.agentResults = {};
                ctx.agentResults['ValidatorAgent'] = {
                    agentName: 'ValidatorAgent',
                    status: 'failed',
                    error: verification.errors?.join('\n') || 'TypeScript verification failed',
                    attempts: 1,
                    startTime: new Date().toISOString()
                };
            });

            await eventBus.stage(executionId, 'testing', 'in_progress', `Validator Agent: Build failed. Routing to Repair Agent...`, 80);

            await repairQueue.add('repair-build', {
                projectId,
                executionId,
                prompt
            });
        }
        const mem = process.memoryUsage();
        const memMb = Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100;
        log(`[Validator] Memory usage: ${memMb} MB (Heap Used)`);
        logger.info({ executionId, memoryMb: memMb }, '[Validator Worker] Memory Usage');

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log(`[Validator] ERROR: ${errorMessage}`);
        logger.error({ error, executionId }, '[Validator Worker] Failed');
        await eventBus.error(executionId, `Validator Error: ${errorMessage}`);
        throw error;
    }
}, {
    connection: redis as unknown as Redis,
    concurrency: 5
});

logger.info('Validator Worker online');
