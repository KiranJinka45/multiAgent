import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { Worker, Job } from 'bullmq';
import { QUEUE_ARCHITECTURE, generatorQueue } from '../src/lib/queue/agent-queues';
import redis from '@queue/redis-client';
import logger from '@configs/logger';
import { TemplateEngine } from '@services/template-engine';
import { CustomizerAgent } from '@services/customizer-agent';
import { VirtualFileSystem, CommitManager } from '@services/vfs';
import { eventBus } from '@configs/event-bus';
import { DistributedExecutionContext } from '@services/execution-context';
import path from 'path';
import fs from 'fs-extra';

const customizerAgent = new CustomizerAgent();

const logPath = path.join(process.cwd(), 'architecture_worker.log');
const log = (msg: string) => {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${timestamp}] ${msg}\n`);
};

const architectureWorker = new Worker(QUEUE_ARCHITECTURE, async (job: Job) => {
    const { projectId, executionId, userId, prompt, intent, strategy } = job.data;
    const sandboxDir = path.join(process.cwd(), '.sandboxes', projectId);
    log(`[Architecture] Job received for ${executionId}`);
    logger.info({ projectId, executionId }, '[Architecture Worker] Started');

    try {
        await eventBus.stage(executionId, 'initializing', 'in_progress', 'Architecture Agent: Designing project structure...', 30);

        // 1. Template Initialization
        logger.info({ projectId, template: intent.templateId }, '[Architecture Worker] Initializing template');
        const relativeFilePaths = await TemplateEngine.copyTemplate(intent.templateId, sandboxDir);

        // 2. Surgical Customization
        logger.info({ projectId }, '[Architecture Worker] Applying surgical edits');
        const vfs = new VirtualFileSystem();

        // Load files from disk state using relative paths
        const initialFiles = await Promise.all(relativeFilePaths.map(async (relPath) => {
            // Strip leading slashes and ensure joined path is correct
            const safeRelPath = relPath.replace(/^[\\\/]+/, '');
            const fullPath = path.join(sandboxDir, safeRelPath);
            const content = await fs.readFile(fullPath, 'utf-8');
            return { path: safeRelPath, content };
        }));

        vfs.loadFromDiskState(initialFiles);

        const customizationResult = await customizerAgent.execute({
            prompt,
            templateId: intent.templateId,
            files: initialFiles.filter(f => f.path.endsWith('.tsx') || f.path.endsWith('.ts')),
            branding: intent.branding,
            features: intent.features
        }, {} as any);

        if (customizationResult.success && customizationResult.data.patches.length > 0) {
            for (const patch of customizationResult.data.patches) {
                vfs.setFile(patch.path, patch.content);
            }
            await CommitManager.commit(vfs, sandboxDir);
            logger.info({ projectId, patches: customizationResult.data.patches.length }, '[Architecture Worker] Applied patches');
        }

        // 3. Update State
        const context = new DistributedExecutionContext(executionId);
        await context.atomicUpdate(ctx => {
            ctx.metadata.architectureReady = true;
            // Record files in VFS for state persistence
            ctx.finalFiles = vfs.getAllFiles();
        });

        await eventBus.agent(executionId, 'ArchitectureAgent', 'structure_designed', 'Project structure and branding applied.');

        // 4. Hand off to Generator stage
        await generatorQueue.add('generate-code', {
            projectId,
            executionId,
            userId,
            prompt,
            intent,
            strategy
        });


        const mem = process.memoryUsage();
        const memMb = Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100;
        log(`[Architecture] Memory usage: ${memMb} MB (Heap Used)`);
        logger.info({ executionId, memoryMb: memMb }, '[Architecture Worker] Memory Usage');

        await eventBus.stage(executionId, 'initializing', 'completed', 'Architecture design complete. Multi-agent code generation started.', 40);

    } catch (error: any) {
        log(`[Architecture] ERROR: ${error.message}`);
        logger.error({ error, executionId }, '[Architecture Worker] Failed');
        await eventBus.error(executionId, `Architecture Error: ${error.message}`);
        throw error;
    }
}, {
    connection: redis,
    concurrency: 5
});

log(`Architecture Worker online. Redis: ${(redis as any).options.port}`);
logger.info('Architecture Worker online');

setInterval(() => {
    const mem = process.memoryUsage();
    const memMb = Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100;
    log(`Heartbeat... Memory: ${memMb} MB`);
}, 30000);

new Promise(() => { });
