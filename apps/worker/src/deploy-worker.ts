import { Worker, Job } from 'bullmq';
import { logger, redis, eventBus, QUEUE_DEPLOY } from '@libs/utils';
import { 
    projectMemory, 
    InfraProvisioner, 
    CICDManager, 
    TenantService, 
    DistributedExecutionContext 
} from '@libs/utils/server';
import { IS_PRODUCTION } from '@libs/utils';
import path from 'path';
import fs from 'fs';

const logPath = path.join(process.cwd(), 'deploy_worker.log');
const log = (msg: string) => {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${timestamp}] ${msg}\n`);
};

export const deployWorker = new Worker(QUEUE_DEPLOY, async (job: Job) => {
    const { projectId, executionId, previewUrl } = job.data;
    const sandboxDir = path.join(process.cwd(), '.generated-projects', projectId);
    log(`[Deploy] Job received for ${executionId}`);
    logger.info({ projectId, executionId }, '[Deploy Worker] Finalizing Deployment');

    try {
        await eventBus.stage(executionId, 'cicd', 'in_progress', 'Deployment Agent: Finalizing project lifecycle...', 95);

        const context = new DistributedExecutionContext(executionId);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = await context.get() as any;
        const allFiles = data?.finalFiles || [];
        const intent = data?.metadata?.intent;

        // 1. Initialize Project Memory
        await projectMemory.initializeMemory(
            projectId,
            { framework: intent?.templateId || 'nextjs', styling: 'tailwind', backend: 'api-routes', database: 'supabase' },
            allFiles
        );

        // 2. Provision Infrastructure (Production)
        const tenant = await TenantService.getTenantForUser(data?.userId || 'unknown');
        if (tenant && IS_PRODUCTION) {
            log('[Deploy Worker] Production Mode: Provisioning resources...');
            const infra = await InfraProvisioner.provisionResources(projectId, tenant.plan);
            await CICDManager.setupPipeline(projectId, sandboxDir, intent?.templateId || 'nextjs');

            await context.atomicUpdate(ctx => {
                ctx.metadata.infra = infra;
                ctx.metadata.deploymentStatus = 'deployed';
            });
        } else {
            log('[Deploy Worker] Dev Mode: Skipping infrastructure provisioning');
        }

        // 3. Finalize Status
        await context.atomicUpdate(ctx => {
            ctx.status = 'completed';
            ctx.locked = true;
        });

        await eventBus.stage(executionId, 'deployment', 'completed', 'Build success! Preview online.', 100);
        await eventBus.complete(executionId, previewUrl, {
            taskCount: allFiles.length,
            autonomousCycles: 1
        });


        const mem = process.memoryUsage();
        const memMb = Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100;
        log(`[Deploy] Memory usage: ${memMb} MB (Heap Used)`);
        logger.info({ executionId, memoryMb: memMb }, '[Deploy Worker] Memory Usage');

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log(`[Deploy] ERROR: ${errorMessage}`);
        logger.error({ error, executionId }, '[Deploy Worker] Failed');

        // Ensure failure is recorded in ExecutionContext for Supervisor
        const context = new DistributedExecutionContext(executionId);
        await context.atomicUpdate(ctx => {
            ctx.status = 'failed';
            ctx.agentResults['DeployAgent'] = {
                agentName: 'DeployAgent',
                status: 'failed',
                error: errorMessage,
                attempts: (ctx.agentResults['DeployAgent']?.attempts || 0) + 1,
                startTime: new Date().toISOString()
            };
        });

        await eventBus.error(executionId, `Deployment Error: ${errorMessage}`);
        throw error;
    }
}, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    connection: redis as any,
    concurrency: 5
});

log(`Deployment Worker online. Redis: ${(redis as any).options.port}`);
logger.info('Deployment Worker online');

setInterval(() => {
    const mem = process.memoryUsage();
    const memMb = Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100;
    log(`Heartbeat... Memory: ${memMb} MB`);
}, 30000);

new Promise(() => { });
