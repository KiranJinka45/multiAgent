/**
 * Script to simulate worker crashes and test graceful/ungraceful shutdown recovery.
 * 
 * Run this in a terminal:
 * npx ts-node src/__scripts__/simulate-worker-crash.ts
 */

import { Worker, Queue } from 'bullmq';
import redis from '../lib/redis';

const QUEUE_NAME = 'project-generation-v1';
const queue = new Queue(QUEUE_NAME, { connection: redis });

async function run() {
    console.log('👷 Crash Test Worker started. Waiting for jobs...');

    const worker = new Worker(QUEUE_NAME, async (job) => {
        console.log(`\n⏳ Started processing job ${job.id}`);
        console.log(`Action requested: ${job.data.action}`);

        if (job.data.action === 'sigterm') {
            console.log('💀 Received instruction to simulate SIGTERM (Graceful Shutdown in progress)...');

            // Trigger shutdown async
            setTimeout(() => {
                console.log('Sending SIGTERM to self...');
                process.kill(process.pid, 'SIGTERM');
            }, 500);

            // Wait long enough that we are still "processing" when term hits
            await new Promise(resolve => setTimeout(resolve, 5000));
            console.log(`✅ Finished processing job ${job.id} gracefully before exit`);
            return 'graceful-success';

        } else if (job.data.action === 'fatal') {
            console.log('💥 Received instruction to process.exit(1) IMMEDIATELY (Hard crash)...');
            // Hard crash, no cleanup, lock abandoned
            setTimeout(() => {
                process.exit(1);
            }, 1000);

            // Hang forever
            await new Promise(() => { });
        } else {
            console.log('✅ Processing normal job...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            return 'success';
        }
    }, { connection: redis });

    worker.on('failed', (job, err) => {
        console.log(`❌ Job ${job?.id} failed with error: ${err.message}`);
    });

    const gracefulShutdown = async () => {
        console.log('\n🛑 SIGTERM received. Closing worker gracefully. Will finish active jobs within timeout...');
        // Close worker, it waits for running jobs to finish
        await worker.close();
        console.log('Worker closed successfully. Exiting.');
        process.exit(0);
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
}

// Fire off test jobs immediately for demonstration
async function injectTestJobs() {
    console.log('Injecting test jobs into queue...');

    // 1. A job that triggers a graceful shutdown (SIGTERM)
    await queue.add('test-graceful', { action: 'sigterm', executionId: 'test-exec-1' }, { removeOnComplete: true });

    // 2. A job that triggers a hard crash (process.exit)
    // You'll need to run the worker again after it crashes to see BullMQ recover this stalled job!
    setTimeout(async () => {
        await queue.add('test-crash', { action: 'fatal', executionId: 'test-exec-2' }, { removeOnComplete: true });
    }, 10000); // 10s later
}

run().catch(console.error);
injectTestJobs().catch(console.error);
