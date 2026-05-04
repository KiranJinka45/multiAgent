import { Worker, Job } from '@packages/utils';
import { runPipeline, updatePipeline, deployPipeline } from '@packages/core-engine';
import { connection } from '@packages/queue';
import { logger } from '@packages/observability';

export const buildWorker = new Worker(
  'build',
  async (job) => {
    const { missionId, prompt, isUpdate, isDeploy, vpsIp } = job.data;
    logger.info({ missionId, jobId: job.id, isUpdate, isDeploy }, '[Worker] Job received');

    try {
        if (isDeploy) {
            const result = await deployPipeline(missionId, vpsIp || '1.1.1.1');
            return result;
        } else if (isUpdate) {
            await updatePipeline(missionId, prompt);
            return { success: true, missionId };
        } else {
            const result = await runPipeline(missionId, prompt);
            return result;
        }
    } catch (error: any) {
        logger.error({ missionId, error: error.message }, '[Worker] Pipeline execution crashed');
        throw error;
    }
  },
  { 
    connection: connection as any,
    concurrency: 5
  }
);

logger.info('[Worker] Build worker online');

