import { freeQueue } from './src';

async function inspect() {
  const waiting = await freeQueue.getWaitingCount();
  const active = await freeQueue.getActiveCount();
  const completed = await freeQueue.getCompletedCount();
  const failed = await freeQueue.getFailedCount();
  const delayed = await freeQueue.getDelayedCount();

  console.log({ waiting, active, completed, failed, delayed });
  
  const failedJobs = await freeQueue.getFailed();
  if (failedJobs.length > 0) {
    console.log('Last Failed Job:', failedJobs[0].id, failedJobs[0].failedReason);
  }
  
  process.exit(0);
}

inspect();
