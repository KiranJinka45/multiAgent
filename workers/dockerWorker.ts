import '../scripts/pre-init';

import { Worker, Job } from 'bullmq';
import { QUEUE_DOCKER, deployQueue } from '../lib/queue/agent-queues';
import redis from '../services/queue/redis-client';
import logger from '../config/logger';
import { DockerDeployer } from '../services/docker-deployer';
import { eventBus } from '../services/event-bus';
import { DistributedExecutionContext } from '../services/execution-context';
import { IS_PRODUCTION } from '../config/build-mode';
import path from 'path';
import fs from 'fs';

const logPath = path.join(process.cwd(), 'docker_worker.log');
const log = (msg: string) => {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${timestamp}] ${msg}\n`);
};

const dockerDeployer = new DockerDeployer();

const dockerWorker = new Worker(QUEUE_DOCKER, async (job: Job) => {
    const { projectId, executionId, strategy } = job.data;
    const sandboxDir = path.join(process.cwd(), '.sandboxes', projectId);
    log(`[Docker] Job received for ${executionId}`);
    logger.info({ projectId, executionId }, '[Docker Worker] Started Build');

    try {
        await eventBus.stage(executionId, 'dockerization', 'in_progress', 'Docker Agent: Building container image...', 90);

        const context = new DistributedExecutionContext(executionId);
        const data = await context.get();
        const targetFiles = data?.finalFiles || [];

        // 1. Build & Deploy Preview
        let previewUrl = `http://localhost:8080/preview-${projectId}`;
        
        if (IS_PRODUCTION) {
            log('[Docker Worker] Production Build: Initiating Docker deployment');
            previewUrl = await dockerDeployer.deploy(projectId, targetFiles, sandboxDir);
        } else {
            log('[Docker Worker] Dev Mode: Bypassing Docker deployment');
            await new Promise(r => setTimeout(r, 1000));
        }

        // 2. Update Context
        await context.atomicUpdate(ctx => {
            ctx.metadata.previewUrl = previewUrl;
            ctx.status = 'executing';
        });

        await eventBus.agent(executionId, 'DockerAgent', 'container_ready', `Preview environment online at ${previewUrl}`);

        // 3. Hand off to Deploy stage
        await deployQueue.add('finalize-deployment', {
            projectId,
            executionId,
            previewUrl,
            strategy
        });

        await eventBus.stage(executionId, 'dockerization', 'completed', 'Docker image ready.', 95);

        const mem = process.memoryUsage();
        const memMb = Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100;
        log(`[Docker] Memory usage: ${memMb} MB (Heap Used)`);
        logger.info({ executionId, memoryMb: memMb }, '[Docker Worker] Memory Usage');

    } catch (error: any) {
        log(`[Docker] ERROR: ${error.message}`);
        logger.error({ error, executionId }, '[Docker Worker] Failed');
        await eventBus.error(executionId, `Docker Error: ${error.message}`);
        throw error;
    }
}, {
    connection: redis as any,
    concurrency: 2 // Docker builds are resource intensive
});

log(`Docker Worker online. Redis: ${(redis as any).options.port}`);
logger.info('Docker Worker online');

setInterval(() => {
    const mem = process.memoryUsage();
    const memMb = Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100;
    log(`Heartbeat... Memory: ${memMb} MB`);
}, 30000);

new Promise(() => { });
