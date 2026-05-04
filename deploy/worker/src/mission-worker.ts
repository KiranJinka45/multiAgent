// @ts-nocheck
import { Worker, Job } from '@packages/utils';
import { redis, QUEUE_FREE, eventBus, missionController } from '@packages/utils';
import { logger } from '@packages/observability';
import { MissionOrchestrator } from '@packages/core-engine';
import { PortManager, ContainerManager } from '@packages/utils';
import path from 'path';
import fs from 'fs-extra';

const orchestrator = new MissionOrchestrator();

if (!QUEUE_FREE) throw new Error("FATAL: QUEUE_FREE name must be provided");

export const missionWorker = new Worker(QUEUE_FREE, async (job: Job) => {
    const { executionId, prompt, projectId } = job.data;
    const PROJECTS_ROOT = path.join(process.cwd(), '.generated-projects');
    const sandboxDir = path.join(PROJECTS_ROOT, projectId);
    
    // Register active job for signal handling
    (global as any).activeMissionId = executionId;
    
    logger.info({ executionId, projectId }, '[MissionWorker] Processing mission');

    try {
        // 1. Generate Code
        const result = await orchestrator.execute(executionId, prompt, projectId);
        if (!result.success) throw new Error(result.error || 'Mission execution failed');

        // 2. Persist to Disk (Required for Docker build/run)
        await fs.ensureDir(sandboxDir);
        for (const file of result.files) {
            const filePath = path.join(sandboxDir, file.path);
            await fs.ensureDir(path.dirname(filePath));
            await fs.writeFile(filePath, file.content);
        }

        // 3. Deploy to Sandbox
        await missionController.updateMission(executionId, { status: 'deploying' });
        await eventBus.stage(executionId, 'deploying', 'in_progress', 'Allocating sandbox resources...', 85, projectId);

        const [port] = await (PortManager as any).acquirePorts(projectId, 1);
        const { containerId } = await (ContainerManager as any).start(projectId, port);

        const previewUrl = `/preview/${projectId}`;
        
        // 4. Finalize
        await missionController.updateMission(executionId, { 
            status: 'complete',
            metadata: { containerId, port, previewUrl }
        });
        
        await eventBus.stage(executionId, 'previewing', 'completed', 'Sandbox is live!', 100, projectId);
        await eventBus.complete(executionId, previewUrl, {
            taskCount: result.files.length,
            autonomousCycles: 1
        });

        logger.info({ executionId, projectId, port }, '[MissionWorker] Sandbox deployed successfully');
    } catch (error: any) {
        logger.error({ executionId, error }, '[MissionWorker] Critical failure');
        await eventBus.error(executionId, error instanceof Error ? error.message : String(error), projectId);
        throw error;
    } finally {
        delete (global as any).activeMissionId;
    }
}, {
    connection: redis,
    concurrency: 5
});

// --- Graceful Shutdown Handler ---
const handleShutdown = async (signal: string) => {
    logger.info({ signal }, '[MissionWorker] Received shutdown signal');
    const missionId = (global as any).activeMissionId;
    
    if (missionId) {
        logger.warn({ missionId }, '[MissionWorker] Interrupting active mission for shutdown');
        try {
            await missionController.updateMission(missionId, { 
                status: 'interrupted',
                metadata: { interruptReason: `Worker SIGKILL (${signal})` }
            });
            await eventBus.error(missionId, `System restart: Mission interrupted by ${signal}. Re-enqueuing...`);
        } catch (err) {
            logger.error({ err }, '[MissionWorker] Failed to mark mission as interrupted');
        }
    }
    
    await missionWorker.close();
    process.exit(0);
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

