const { Queue } = require('bullmq');
const IORedis = require('ioredis');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const QUEUE_NAME = 'project-generation-free-v1';

async function trigger() {
    console.log(`🚀 Connecting to Redis at ${REDIS_URL}...`);
    const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
    
    const queue = new Queue(QUEUE_NAME, { connection });

    const jobData = {
        executionId: `test-mission-${Date.now()}`,
        projectId: 'mission-one-todo',
        prompt: 'Build a sleek, modern Todo application using Next.js 14, Tailwind CSS, and Lucide icons. Include a header, a list with add/delete functionality, and a dark mode toggle.'
    };

    console.log(`📦 Injecting job into ${QUEUE_NAME}...`);
    const job = await queue.add('build-init', jobData);
    
    console.log(`✅ Mission enqueued! Job ID: ${job.id}`);
    console.log(`🔍 Execution ID: ${jobData.executionId}`);
    
    await connection.quit();
    process.exit(0);
}

trigger().catch(err => {
    console.error('❌ Failed to trigger mission:', err);
    process.exit(1);
});
