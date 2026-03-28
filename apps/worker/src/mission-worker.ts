import { Worker, Job } from 'bullmq';
import { redis, QUEUE_FREE, logger, eventBus, missionController } from '@packages/utils/server';
import { MissionOrchestrator } from '@packages/core-engine';
import { PortManager, ContainerManager } from '@packages/sandbox-runtime';
import path from 'path';
import fs from 'fs-extra';

const orchestrator = new MissionOrchestrator();

export const missionWorker = new Worker(QUEUE_FREE, async (job: Job) => {
    const { executionId, prompt, projectId } = job.data;
    const PROJECTS_ROOT = path.join(process.cwd(), '.generated-projects');
    const sandboxDir = path.join(PROJECTS_ROOT, projectId);
    
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

        const [port] = await PortManager.acquirePorts(projectId, 1);
        const { containerId } = await ContainerManager.start(projectId, port);

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
        
    } catch (error) {
        logger.error({ executionId, error }, '[MissionWorker] Critical failure');
        await eventBus.error(executionId, error instanceof Error ? error.message : String(error), projectId);
        throw error;
    }
}, {
    connection: redis as any,
    concurrency: 5
} as any);
