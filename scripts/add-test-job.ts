import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import 'dotenv/config';

const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
});

async function main() {
    console.log('🚀 Adding test job to free_queue...');
    const queue = new Queue('free_queue', { connection: redis });
    const job = await queue.add('build:init', {
        missionId: 'manual_test_' + Date.now(),
        prompt: 'Manual test prompt'
    });
    console.log('✅ Job added:', job.id);
    process.exit(0);
}

main().catch(console.error);
