import '../scripts/pre-init';

import { Worker, Job } from 'bullmq';
import { QUEUE_SUPERVISOR, supervisorQueue } from '../lib/queue/agent-queues';
import redis from '@libs/utils';
import logger from '../config/logger';
import { supervisorService } from '../api-gateway/services/supervisor';
import { DistributedExecutionContext } from '../api-gateway/services/execution-context';
import { PreviewWatchdog } from '../runtime/watchdog';

PreviewWatchdog.start();

new Worker(QUEUE_SUPERVISOR, async (job: Job) => {
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
    connection: redis as any,
    concurrency: 1
});

// Setup repeatable job if it doesn't exist
async function setupCron() {
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

setInterval(() => {
    // Heartbeat
}, 30000);

new Promise(() => { });
