import 'dotenv/config';
import { initTelemetry } from '@libs/observability';
initTelemetry('multiagent-deploy-service');

import { Worker, Job } from 'bullmq';
import { 
    redis, 
    DEPLOYMENT_QUEUE, 
    logger, 
    ReliabilityMonitor 
} from '@libs/utils/server';
import { db as prisma } from '@libs/db';
import { VercelDeployer } from './deployer';

const worker = new Worker(DEPLOYMENT_QUEUE, async (job: Job) => {
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
                    ...(await prisma.mission.findUnique({ where: { id: executionId } }))?.metadata as Record<string, unknown>,
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
                    ...(await prisma.mission.findUnique({ where: { id: executionId } }))?.metadata as Record<string, unknown>,
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

logger.info('[DeployService] Worker started, listening on DEPLOYMENT_QUEUE');
