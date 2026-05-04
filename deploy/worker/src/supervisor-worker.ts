// @ts-nocheck
import { Worker, Job, Queue } from '@packages/utils';
import { logger } from '@packages/observability';
import { redis, QUEUE_SUPERVISOR, supervisorQueue, supervisorService, DistributedExecutionContext } from '@packages/utils';
import { PreviewWatchdog } from '@packages/runtime/watchdog';

if (!QUEUE_SUPERVISOR) throw new Error("FATAL: QUEUE_SUPERVISOR name must be provided");

PreviewWatchdog.start();

export const supervisorWorker = new Worker(QUEUE_SUPERVISOR, async (job: Job) => {
    if (job.name === 'health-check-loop') {
        const activeIds = await DistributedExecutionContext.getActiveExecutions();
        logger.info({ count: activeIds.length }, '[Supervisor Worker] Running global health check');

        for (const id of activeIds) {
            try {
                const decision = await supervisorService.checkHealth(id);
                if (decision !== 'NONE') {
                    await supervisorService.handleDecision(id, decision);
                }
            } catch (err) {
                logger.error({ id, err }, '[Supervisor Worker] Error checking execution health');
            }
        }
    }
}, {
    connection: redis,
    concurrency: 1
});

// Setup repeatable job if it doesn't exist
async function setupCron() {
    if (!supervisorQueue) {
        logger.warn('[Supervisor Worker] supervisorQueue not initialized, skipping cron setup');
        return;
    }
    const repeatableJobs = await supervisorQueue.getRepeatableJobs();
    if (!repeatableJobs.find(j => j.name === 'health-check-loop')) {
        await supervisorQueue.add('health-check-loop', {}, {
            repeat: {
                every: 30000 // 30 seconds
            }
        });
        logger.info('[Supervisor Worker] Repeatable health-check-loop job scheduled.');
    }
}

setupCron().catch(err => logger.error({ err }, 'Failed to setup supervisor cron'));

logger.info('Supervisor Worker online');


