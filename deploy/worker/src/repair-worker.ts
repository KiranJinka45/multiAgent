// @ts-nocheck
import { Worker, Job } from '@packages/utils';
import { Redis } from 'ioredis';
import { logger } from '@packages/observability';
import { redis, eventBus, QUEUE_REPAIR } from '@packages/utils';
import { 
    validatorQueue, 
    DistributedExecutionContext, 
    VirtualFileSystem, 
    CommitManager 
} from '@packages/utils';
import { RepairAgent } from '@packages/agents';

import path from 'path';
import fs from 'fs';
const logPath = path.join(process.cwd(), 'repair_direct.log');
const log = (msg: string) => fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);

log('Repair Worker script started');

const repairAgent = new RepairAgent();

export const repairWorker = new Worker(QUEUE_REPAIR, async (job: Job) => {
    const { executionId, projectId, prompt } = job.data;
    log(`[Repair] Job received for ${executionId}`);
    const sandboxDir = path.join(process.cwd(), '.generated-projects', projectId);
    logger.info({ executionId, projectId }, '[Repair Worker] Starting autonomous repair');

    try {
        const context = new DistributedExecutionContext(executionId);
        const data = await context.get();
        if (!data) return;

        // --- REPAIR LIMIT GUARD (Fix 5) ---
        const repairAttempts = await redis.hincrby(`mission:stats:${executionId}`, 'repair_attempts', 1);
        
        if (repairAttempts > 3) {
            log(`[Repair] Limit exceeded (${repairAttempts}). Failing mission.`);
            await eventBus.error(executionId, 'Build failed autonomously after 3 repair attempts. Manual intervention required.');
            return;
        }
        // ----------------------------------

        await eventBus.stage(executionId, 'testing', 'in_progress', `Supervisor: Engaging Repair Agent to fix build errors (Attempt ${repairAttempts}/3)...`, 80);

        // 1. Get failed agent information
        const agentResults = (data.agentResults as any) || {};
        const failedAgent = Object.values(agentResults).find((r: any) => r.status === 'failed') as any;
        const error = failedAgent?.error || 'Unknown error';

        // 2. Prepare files for RepairAgent
        const allFiles = (data.finalFiles as any) || [];

        // 3. Invoke RepairAgent
        const repairResult = await (repairAgent as any).execute({
            error,
            stdout: '',
            files: allFiles.slice(0, 20)
        }, {} as any);

        if (repairResult.success && repairResult.data.patches?.length > 0) {
            const vfs = new VirtualFileSystem();
            vfs.loadFromDiskState(allFiles);

            for (const patch of repairResult.data.patches) {
                (vfs as any).setFile(patch.path, patch.content);
            }

            // 4. Commit fixes
            await (CommitManager as any).commit(vfs, sandboxDir);

            // 5. Update context
            await context.atomicUpdate((ctx: any) => {
                ctx.finalFiles = (vfs as any).getAllFiles();
                if (failedAgent && ctx.agentResults && ctx.agentResults[failedAgent.agentName]) {
                    ctx.agentResults[failedAgent.agentName].status = 'pending';
                }
            });

            log(`[Repair] Success! Applied ${repairResult.data.patches.length} patches.`);

            // 6. Re-enqueue the validator stage
            log(`[Repair] Re-enqueuing validator...`);
            await validatorQueue.add('verify-repaired-build', {
                projectId,
                executionId,
                prompt
            });
        } else {
            log(`[Repair] Failed to generate patches.`);
            throw new Error('RepairAgent could not generate valid patches.');
        }

    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        log(`[Repair] CRITICAL ERROR: ${errorMessage}`);
        logger.error({ err, executionId }, '[Repair Worker] Repair failed');
        await eventBus.error(executionId, `Repair failed: ${errorMessage}`);
        throw err;
    }
}, {
    connection: redis as unknown as Redis,
    concurrency: 2
});

logger.info('Repair Worker online');

process.on('SIGINT', () => { console.log("RECEIVED SIGINT"); process.exit(0); });
process.on('SIGTERM', () => { console.log("RECEIVED SIGTERM"); process.exit(0); });

setInterval(() => {
    log("Heartbeat...");
}, 30000);

new Promise(() => { });

