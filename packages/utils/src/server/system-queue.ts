import { Queue, Worker, Job, ConnectionOptions } from 'bullmq';
import redis from './redis';
import logger from '@packages/observability';
import { createLazyProxy, isRuntime } from './runtime';

// Mock reconcileBilling since it's missing from the codebase
async function reconcileBilling() {
    return { success: true };
}

export const SYSTEM_QUEUE_NAME = 'system-maintenance-v1';

export const systemQueue = createLazyProxy(() => new Queue(SYSTEM_QUEUE_NAME, {
    connection: redis as unknown as ConnectionOptions,
    defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false // Keep failures for audit
    }
}), 'Queue_System');

// Worker for system maintenance
let systemWorker: Worker | null = null;

export function initSystemWorker() {
    if (!isRuntime() || systemWorker) return;

    systemWorker = new Worker(
        SYSTEM_QUEUE_NAME,
        async (job) => {
            if (job.name === 'reconcile-billing') {
                return await reconcileBilling();
            }
        },
        { connection: redis as unknown as ConnectionOptions }
    );

    systemWorker.on('completed', (job: Job) => {
        logger.info({ jobId: job.id, jobName: job.name }, 'System job completed');
    });

    systemWorker.on('failed', (job: Job | undefined, err: Error) => {
        logger.error({ jobId: job?.id, jobName: job?.name, err }, 'System job failed');
    });

    logger.info('System Maintenance Worker initialized');
}

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

// Auto-init at runtime
if (isRuntime()) {
    initSystemWorker();
}
