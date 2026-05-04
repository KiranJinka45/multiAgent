import { safeInitTelemetry } from '@packages/observability';
safeInitTelemetry({ serviceName: 'multiagent-deploy-service' });

import { Worker, Job } from 'bullmq';
import { 
    redis, 
    QUEUE_DEPLOY, 
    logger, 
    ReliabilityMonitor 
} from '@packages/utils';
import { db as prisma } from '@packages/db';
import { VercelDeployer } from './deployer.js';

const worker = new Worker(QUEUE_DEPLOY, async (job: Job) => {
    const { projectId, executionId, sandboxDir } = job.data;
    
    logger.info({ projectId, executionId }, '[DeployService] Starting deployment');

    try {
        // 1. Update status to 'deploying'
        await prisma.mission.update({
            where: { id: executionId },
            data: { 
                status: 'deploying',
                updatedAt: new Date()
            }
        });

        // 2. Perform deployment
        const deployer = new VercelDeployer();
        const url = await deployer.deploy(projectId, sandboxDir);

        logger.info({ projectId, executionId, url }, '[DeployService] Deployment successful');

        // 3. Update mission with URL and status 'complete'
        await prisma.mission.update({
            where: { id: executionId },
            data: { 
                status: 'complete',
                metadata: {
                    ...((await prisma.mission.findUnique({ where: { id: executionId } })) as any)?.metadata,
                    url,
                    deployedAt: new Date().toISOString()
                }
            }
        });

        return { url };
    } catch (err: unknown) {
        const error = err as Error;
        logger.error({ projectId, executionId, error: error.message }, '[DeployService] Deployment failed');
        
        await ReliabilityMonitor.recordError({
            service: 'deploy-service',
            error: error.message,
            stack: error.stack,
            executionId,
            context: { projectId, sandboxDir },
            timestamp: new Date().toISOString()
        });

        await prisma.mission.update({
            where: { id: executionId },
            data: { 
                status: 'failed',
                metadata: {
                    ...((await prisma.mission.findUnique({ where: { id: executionId } })) as any)?.metadata,
                    deploymentError: error.message
                }
            }
        });

        throw err;
    }
}, {
    connection: redis,
    concurrency: 2
});

worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, error: err.message }, '[DeployService] Job failed permanently');
});

logger.info('[DeployService] Worker started, listening on QUEUE_DEPLOY');

