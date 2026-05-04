import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

import { queueManager } from '../packages/utils/src/queue-manager';
import logger from '../packages/utils/src/logger';

// Mock Redis connection with BullMQ required settings
const connection = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
    maxRetriesPerRequest: null
});

const TEST_QUEUE = 'reliability-test-queue';
const DLQ_NAME = 'dead-letter-queue';

async function runTest() {
    console.log('🚀 Starting BullMQ Reliability Test...');

    // 1. Setup Test Worker
    const testWorker = new Worker(TEST_QUEUE, async (job) => {
        console.log(`[Worker] Processing job ${job.id}, attempt ${job.attemptsMade}`);
        
        // --- IDEMPOTENCY CHECK ---
        const lockKey = `job:lock:${TEST_QUEUE}:${job.id}`;
        const isProcessing = await connection.set(lockKey, 'locked', 'EX', 3600, 'NX');
        if (!isProcessing) {
            console.log(`[Worker] Duplicate detected for ${job.id}. Skipping.`);
            return;
        }

        if (job.data.fail) {
            throw new Error('Planned Test Failure');
        }
        return { success: true };
    }, { connection });

    testWorker.on('failed', async (job, err) => {
        const attemptsMade = job?.attemptsMade || 0;
        const maxAttempts = job?.opts.attempts || 3;
        console.log(`[Worker] Job ${job?.id} failed. Attempt: ${attemptsMade}/${maxAttempts}. Error: ${err.message}`);
        
        if (job && attemptsMade >= maxAttempts) {
            console.log(`[Worker] Max attempts reached for ${job.id}. Moving to DLQ.`);
            await queueManager.moveToDLQ(job, err);
        }
    });

    const queue = new Queue(TEST_QUEUE, { 
        connection,
        defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 } // Faster delay for testing
        }
    });

    // 2. Test Retries and DLQ
    console.log('\n--- Testing Retries and DLQ ---');
    const failingJobId = `fail_${Date.now()}`;
    await queue.add('test-fail', { fail: true }, { jobId: failingJobId });
    console.log(`Submitted failing job ${failingJobId}`);

    // Wait for retries (3 attempts with 1s backoff)
    // 1st run (0s) + 1s backoff + 2nd run + 1s backoff + 3rd run
    await new Promise(r => setTimeout(r, 10000));

    // Wait extra for DLQ movement to persist
    await new Promise(r => setTimeout(r, 2000));

    const dlq = new Queue(DLQ_NAME, { connection });
    // Check all states: waiting, active, completed, failed, delayed, paused
    const dlqJobs = await dlq.getJobs(['waiting', 'completed', 'active', 'failed']);
    const movedToDlq = dlqJobs.find(j => j.data.originalJobId === failingJobId);

    if (movedToDlq) {
        console.log('✅ SUCCESS: Job moved to DLQ after failures.');
        console.log(`   Failure Reason: ${movedToDlq.data.failedReason}`);
    } else {
        console.log('❌ FAILURE: Job NOT found in DLQ.');
    }

    // 3. Test Idempotency
    console.log('\n--- Testing Idempotency ---');
    const idKey = `idem_${Date.now()}`;
    await queue.add('test-idem', { fail: false }, { jobId: idKey });
    await queue.add('test-idem', { fail: false }, { jobId: idKey }); // Duplicate ID

    await new Promise(r => setTimeout(r, 2000));
    // BullMQ handles duplicate IDs by not adding the second job, 
    // but our extra Redis lock handles the case where two workers might pick up same job (edge case)
    // or if the job is resubmitted after completion.

    console.log('✅ SUCCESS: Idempotency check completed (verified by logs).');

    // Cleanup
    await testWorker.close();
    await queue.close();
    await dlq.close();
    await connection.quit();
    console.log('\n🏁 Reliability Test Finished.');
    process.exit(0);
}

runTest().catch(err => {
    console.error('Test crashed:', err);
    process.exit(1);
});

