import { Queue, Worker } from 'bullmq';
import redis from './redis';
import logger from './logger';
import { reconcileBilling } from '../reconciler';

export const SYSTEM_QUEUE_NAME = 'system-maintenance-v1';

export const systemQueue = new Queue(SYSTEM_QUEUE_NAME, {
    connection: redis,
    defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false // Keep failures for audit
    }
});

// Worker for system maintenance
const systemWorker = new Worker(
    SYSTEM_QUEUE_NAME,
    async (job) => {
        if (job.name === 'reconcile-billing') {
            return await reconcileBilling();
        }
    },
    { connection: redis }
);

// Schedule the repeatable job
export async function setupSystemJobs() {
    await systemQueue.add(
        'reconcile-billing',
        {},
        {
            repeat: {
                pattern: '0 * * * *', // Hourly (at the start of every hour)
            },
            jobId: 'reconcile-billing-hourly'
        }
    );
    logger.info('Hourly billing reconciliation job scheduled.');
}

systemWorker.on('completed', (job) => {
    logger.info({ jobId: job.id, jobName: job.name }, 'System job completed');
});

systemWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, jobName: job?.name, err }, 'System job failed');
});
