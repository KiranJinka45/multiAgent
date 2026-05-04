// @ts-nocheck
import { Worker, Job } from '@packages/utils';
import { Redis } from 'ioredis';
import { logger } from '@packages/observability';
import { redis, QUEUE_REFACTOR } from '@packages/utils';
import { applyFixes } from '@packages/refactor-agent'; // Using exported member

if (!QUEUE_REFACTOR) throw new Error("FATAL: QUEUE_REFACTOR name must be provided");

export const autoRefactorWorker = new Worker(QUEUE_REFACTOR, async (job: Job) => {
    const { targetPath } = job.data;
    logger.info({ jobId: job.id, targetPath }, '[Auto-Refactor Worker] Starting refactoring process');
    
    try {
        if (!targetPath) {
            throw new Error('targetPath is required for auto-refactor');
        }
        
        const fixed = await applyFixes(targetPath);
        
        logger.info({ fixed, targetPath }, '[Auto-Refactor Worker] Refactoring completed');
        return fixed;
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        logger.error({ err, targetPath }, '[Auto-Refactor Worker] Refactoring failed');
        throw new Error(`Refactor Error: ${errorMessage}`);
    }
}, {
    connection: redis,
    concurrency: 2
});

logger.info('Auto-Refactor Worker online');


