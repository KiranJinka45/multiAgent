import '../scripts/pre-init';
import { Worker, Job } from 'bullmq';
import { QUEUE_VALIDATOR, dockerQueue, repairQueue } from '../src/lib/queue/agent-queues';
import redis from '@queue/redis-client';
import logger from '@configs/logger';
import { patchVerifier } from '@services/patch-verifier';
import { DebugAgent } from '@services/debug-agent';
import { VirtualFileSystem, CommitManager, PatchEngine } from '@services/vfs';
import { AgentMemory } from '@services/agent-memory';
import { eventBus } from '@configs/event-bus';
import { DistributedExecutionContext } from '@services/execution-context';
import path from 'path';
import fs from 'fs';

const logPath = path.join(process.cwd(), 'validator_direct.log');
const log = (msg: string) => fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);

const debugAgent = new DebugAgent();

const validatorWorker = new Worker(QUEUE_VALIDATOR, async (job: Job) => {
    const { projectId, executionId, prompt, strategy } = job.data;
    log(`[Validator] Job received for ${executionId}`);
    const sandboxDir = path.join(process.cwd(), '.sandboxes', projectId);
    logger.info({ projectId, executionId }, '[Validator Worker] Started Verification');

    try {
        await eventBus.stage(executionId, 'testing', 'in_progress', 'Validator Agent: Running type checks...', 75);

        const context = new DistributedExecutionContext(executionId);
        const data = await context.get();
        const allFiles = data?.finalFiles || [];

        const vfs = new VirtualFileSystem();
        vfs.loadFromDiskState(allFiles);

        log(`[Validator] Running verifier on ${sandboxDir}`);
        const verification = await patchVerifier.verify(sandboxDir, vfs);

        if (verification.passed) {
            log(`[Validator] PASSED`);
            await eventBus.agent(executionId, 'ValidatorAgent', 'build_passed', 'Build verification passed ✅');

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
            // In a real autonomous loop, we might call DebugAgent.
            // But for Chaos Test 2, we want to see the REPAIR AGENT triggered.
            // The Repair Worker handles jobs from repairQueue.

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

    } catch (error: any) {
        log(`[Validator] ERROR: ${error.message}`);
        logger.error({ error, executionId }, '[Validator Worker] Failed');
        await eventBus.error(executionId, `Validator Error: ${error.message}`);
        throw error;
    }
}, {
    connection: redis,
    concurrency: 5
});

log(`Validator Worker online. Redis: ${(redis as any).options.port}`);
logger.info('Validator Worker online');

process.on('SIGINT', () => { log("RECEIVED SIGINT"); process.exit(0); });
process.on('SIGTERM', () => { log("RECEIVED SIGTERM"); process.exit(0); });

setInterval(() => {
    const mem = process.memoryUsage();
    const memMb = Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100;
    log(`Heartbeat... Memory: ${memMb} MB`);
}, 30000);

new Promise(() => { });
