// @ts-nocheck
import { Worker, Job } from '@packages/utils';
import { redis, eventBus, QUEUE_DEPLOY, IS_PRODUCTION } from '@packages/utils';
import { logger } from '@packages/observability';
import { db } from '@packages/db';
import { 
    projectMemory, 
    InfraProvisioner, 
    CICDManager, 
    TenantService, 
    DistributedExecutionContext 
} from '@packages/utils';
import path from 'path';
import fs from 'fs';

if (!QUEUE_DEPLOY) throw new Error("FATAL: QUEUE_DEPLOY name must be provided");

const logPath = path.join(process.cwd(), 'deploy_worker.log');
const log = (msg: string) => {
    const timestamp = new Date().toISOString();
    try {
        fs.appendFileSync(logPath, `[${timestamp}] ${msg}\n`);
    } catch (e) {}
};

export const deployWorker = new Worker(QUEUE_DEPLOY, async (job: Job) => {
    const { projectId, executionId, previewUrl, agentId, config } = job.data;
    
    if (agentId) {
        // --- ASYNC AGENT PROVISIONING PATH ---
        log(`[AgentDeploy] Job received for agent:${agentId}`);
        try {
            await db.agent.update({
                where: { id: agentId },
                data: { status: 'busy', lastActive: new Date() }
            });

            // Simulate provisioning steps
            await new Promise(r => setTimeout(r, 2000));

            await db.agent.update({
                where: { id: agentId },
                data: { status: 'standby', lastActive: new Date() }
            });
            log(`[AgentDeploy] Agent ${agentId} is now online.`);

            // Signal completion to the mesh
            await eventBus.publish(agentId, 'agent_provisioned', {
                agentId,
                status: 'standby',
                message: `Agent ${agentId} is ready for deployment.`
            });

            return { success: true };
        } catch (error) {
            log(`[AgentDeploy] ERROR for agent:${agentId}: ${error}`);
            await db.agent.update({
                where: { id: agentId },
                data: { status: 'offline' }
            }).catch(() => {});
            
            await eventBus.publish(agentId, 'agent_failed', {
                agentId,
                status: 'offline',
                error: (error as any).message || 'Provisioning failed'
            });
            
            throw error;
        }
    }

    const sandboxDir = path.join(process.cwd(), '.generated-projects', projectId || 'unknown');
    log(`[Deploy] Job received for ${executionId}`);
    logger.info({ projectId, executionId }, '[Deploy Worker] Finalizing Deployment');

    try {
        await eventBus.stage(executionId, 'cicd', 'in_progress', 'Deployment Agent: Finalizing project lifecycle...', 95);

        const context = new DistributedExecutionContext(executionId);
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
    connection: redis,
    concurrency: 5
});

log(`Deployment Worker online. Redis: ${(redis as { options: { port: number } }).options.port}`);
logger.info('Deployment Worker online');

setInterval(() => {
    const mem = process.memoryUsage();
    const memMb = Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100;
    log(`Heartbeat... Memory: ${memMb} MB`);
}, 30000);

new Promise(() => { });
