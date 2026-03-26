import { Queue, Worker } from 'bullmq';
import { logger } from '@libs/utils';
import { runAutonomousAgent } from './index';

const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

export const autonomousQueue = new Queue('autonomous-tasks', {
  connection: REDIS_CONFIG,
});

export function setupAutonomousWorker() {
  logger.info('Initializing Autonomous Task Worker...');
  
  const worker = new Worker('autonomous-tasks', async (job) => {
    logger.info({ jobId: job.id, prompt: job.data.prompt }, 'Processing Autonomous Task...');
    await runAutonomousAgent(job.data.prompt);
  }, { connection: REDIS_CONFIG });

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Autonomous Task Completed.');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Autonomous Task Failed.');
  });

  return worker;
}
