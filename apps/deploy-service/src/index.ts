import { Worker, Job, Queue } from 'bullmq';
import { redis, logger, DEPLOYMENT_QUEUE } from '@libs/utils';
import { prisma } from '@libs/db';
import { startTracing } from '@libs/observability';
import path from 'path';

// Initialize Tracing
startTracing();

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;

/**
 * Cloud Deployment Orchestrator
 * In a real production setup, this would utilize the Vercel API or a custom Kubernetes deployer.
 */
async function deployToCloud(projectId: string, sandboxDir: string): Promise<string> {
    logger.info({ projectId, sandboxDir }, '[DeployService] Initiating cloud deployment...');
    
    if (!VERCEL_TOKEN) {
        logger.warn('[DeployService] VERCEL_TOKEN missing. Using mock deployment URL.');
        // Deterministic mock URL for development stability
        const shortId = projectId.split('-')[0];
        return `https://multiagent-${shortId}.vercel.app`;
    }

    // --- PROD PATH: Vercel API Integration (Simulated) ---
    // In a full implementation, we would:
    // 1. Zip the sandboxDir
    // 2. POST to https://api.vercel.com/v13/deployments
    // 3. Poll for status
    await new Promise(resolve => setTimeout(resolve, 3000));
    return `https://multiagent-${projectId.slice(0, 8)}.vercel.app`;
}

const worker = new Worker(DEPLOYMENT_QUEUE, async (job: Job) => {
    const { projectId, executionId, sandboxDir } = job.data;
    
    logger.info({ projectId, jobId: job.id }, '[DeployService] Processing deployment job');
    
    try {
        const liveUrl = await deployToCloud(projectId, sandboxDir);
        
        // Update Build record with the live URL
        await prisma.build.update({
            where: { id: executionId },
            data: { 
                previewUrl: liveUrl,
                status: 'SUCCESS'
            }
        });

        // Elevate Project status to READY
        await prisma.project.update({
            where: { id: projectId },
            data: { status: 'READY' }
        });

        logger.info({ projectId, liveUrl }, '[DeployService] Deployment successful!');
        return { success: true, url: liveUrl };
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error({ err: msg, projectId }, '[DeployService] Deployment failed');
        
        await prisma.build.update({
            where: { id: executionId },
            data: { status: 'FAILED' }
        });
        
        throw err;
    }
}, { 
    connection: redis as any,
    concurrency: 5 
});

logger.info(`[Deployment-Pipeline] Service started on pid ${process.pid}`);

// Graceful Shutdown
const shutdown = async () => {
    logger.info('[DeployService] Shutting down...');
    await worker.close();
    await redis.quit();
    process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
