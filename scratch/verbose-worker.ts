import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { redis, QUEUE_FREE } from '@packages/utils';

console.log('🚀 Verbose Worker starting...');
console.log('Queue Name:', QUEUE_FREE);
console.log('Redis Status:', (redis as any).status);

const worker = new Worker(QUEUE_FREE, async (job: Job) => {
    console.log('📥 RECEIVED JOB:', job.id, job.data);
    await new Promise(r => setTimeout(r, 1000));
    console.log('✅ COMPLETED JOB:', job.id);
    return { success: true };
}, {
    connection: redis as any,
    concurrency: 1
});

worker.on('active', (job) => console.log('🏃 Job Active:', job.id));
worker.on('completed', (job) => console.log('🏁 Job Completed:', job.id));
worker.on('failed', (job, err) => console.error('❌ Job Failed:', job?.id, err));
worker.on('error', (err) => console.error('🔥 Worker Error:', err));

console.log('📡 Listening for jobs...');
