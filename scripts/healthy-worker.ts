import { Worker } from 'bullmq';
import { SecretProvider } from '../packages/config/src/env';
import { QueueManager } from '../packages/utils/src/index';

const TEST_QUEUE = 'chaos-certification-queue';

async function startHealthyWorker() {
    await SecretProvider.init(['REDIS_URL']);
    console.log('👷 [HEALTHY] Starting recovery worker to finish jobs...');
    
    const worker = await QueueManager.process(TEST_QUEUE, async (job) => {
        console.log(`  - [HEALTHY] Processed job ${job.id} (${job.data.priority})`);
        await new Promise(r => setTimeout(r, 10));
        return { processed: true };
    });

    console.log('✅ Worker active. Waiting for queue to drain...');
}

startHealthyWorker().catch(console.error);
