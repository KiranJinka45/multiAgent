import '../scripts/pre-init';
import path from 'path';

import { Worker, Job } from 'bullmq';
import { QUEUE_REPAIR, validatorQueue } from '../lib/queue/agent-queues';
import redis from '../services/queue/redis-client';
import logger from '../config/logger';
import { RepairAgent } from '../agents/repair-agent';
import { DistributedExecutionContext } from '../services/execution-context';
import { VirtualFileSystem, CommitManager } from '../services/vfs';
import { eventBus } from '../services/event-bus';

import fs from 'fs';
const logPath = path.join(process.cwd(), 'repair_direct.log');
const log = (msg: string) => fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);

log('Repair Worker script started');

const repairAgent = new RepairAgent();

const repairWorker = new Worker(QUEUE_REPAIR, async (job: Job) => {
    const { executionId, projectId, prompt } = job.data;
    log(`[Repair] Job received for ${executionId}`);
    const sandboxDir = path.join(process.cwd(), '.sandboxes', projectId);
    logger.info({ executionId, projectId }, '[Repair Worker] Starting autonomous repair');

    try {
        const context = new DistributedExecutionContext(executionId);
        const data = await context.get();
        if (!data) return;

        await eventBus.stage(executionId, 'testing', 'in_progress', 'Supervisor: Engaging Repair Agent to fix build errors...', 80);

        // 1. Get failed agent information
        const failedAgent = Object.values(data.agentResults).find(r => r.status === 'failed');
        const error = failedAgent?.error || 'Unknown error';

        // 2. Prepare files for RepairAgent
        const allFiles = data.finalFiles || [];

        // 3. Invoke RepairAgent
        const repairResult = await repairAgent.execute({
            error,
            stdout: '', // We could pipe stdout here if available
            files: allFiles.slice(0, 20) // Top files for context
        }, {} as any);

        if (repairResult.success && repairResult.data.patches?.length > 0) {
            const vfs = new VirtualFileSystem();
            vfs.loadFromDiskState(allFiles);

            for (const patch of repairResult.data.patches) {
                vfs.setFile(patch.path, patch.content);
            }

            // 4. Commit fixes
            await CommitManager.commit(vfs, sandboxDir);

            // 5. Update context
            await context.atomicUpdate(ctx => {
                ctx.finalFiles = vfs.getAllFiles();
                // Clear failed status so it can retry
                if (failedAgent) {
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

    } catch (err: any) {
        log(`[Repair] CRITICAL ERROR: ${err.message}`);
        logger.error({ err, executionId }, '[Repair Worker] Repair failed');
        await eventBus.error(executionId, `Repair failed: ${err.message}`);
        throw err;
    }
}, {
    connection: redis as any,
    concurrency: 2
});

logger.info('Repair Worker online');

process.on('SIGINT', () => { console.log("RECEIVED SIGINT"); process.exit(0); });
process.on('SIGTERM', () => { console.log("RECEIVED SIGTERM"); process.exit(0); });

setInterval(() => {
    log("Heartbeat...");
}, 30000);

new Promise(() => { });
