import 'dotenv/config';
import { Queue } from 'bullmq';
import { redis, QUEUE_FREE } from '@packages/utils';

async function check() {
    const queue = new Queue(QUEUE_FREE, { connection: redis as any });
    
    const counts = await queue.getJobCounts();
    console.log('Job Counts:', JSON.stringify(counts, null, 2));

    const failedJobs = await queue.getJobs(['failed'], 0, 10);
    console.log('\nLast 10 Failed Jobs:');
    for (const job of failedJobs) {
        console.log(`- Job ${job.id}: ${job.failedReason} (at ${job.finishedOn ? new Date(job.finishedOn).toISOString() : 'unknown'})`);
    }

    const completedJobs = await queue.getJobs(['completed'], 0, 20);
    console.log('\nLast 20 Completed Jobs:');
    for (const job of completedJobs) {
        console.log(`- Job ${job.id} (at ${job.finishedOn ? new Date(job.finishedOn).toISOString() : 'unknown'})`);
    }

    const activeJobs = await queue.getJobs(['active']);
    console.log('\nActive Jobs:', activeJobs.length);
    for (const job of activeJobs) {
        console.log(`- Job ${job.id} (started at ${job.processedOn ? new Date(job.processedOn).toISOString() : 'unknown'})`);
    }

    const waitingJobs = await queue.getJobs(['waiting']);
    console.log('\nWaiting Jobs:', waitingJobs.length);
    for (const job of waitingJobs) {
        console.log(`- Job ${job.id}`);
    }
}

check().catch(console.error).finally(() => process.exit(0));
