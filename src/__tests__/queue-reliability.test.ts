import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Queue, Worker, QueueEvents, Job } from 'bullmq';
import redis from '../lib/redis';
import { v4 as uuidv4 } from 'uuid';

const TEST_QUEUE_NAME = 'test-reliability-queue';

describe('BullMQ Queue Reliability Integration Tests', () => {
    let queue: Queue;
    let queueEvents: QueueEvents;
    let workers: Worker[] = [];

    beforeAll(async () => {
        if (redis.status !== 'ready') {
            await new Promise(resolve => redis.on('ready', resolve));
        }

        queue = new Queue(TEST_QUEUE_NAME, {
            connection: redis,
            defaultJobOptions: {
                attempts: 3,
                backoff: { type: 'exponential', delay: 100 }, // Fast backoff for testing
                removeOnComplete: true,
                removeOnFail: false, // Keep in DLQ (failed set) for inspection
            }
        });

        queueEvents = new QueueEvents(TEST_QUEUE_NAME, { connection: redis });
    });

    afterAll(async () => {
        await Promise.all(workers.map(w => w.close()));
        await queue.close();
        await queueEvents.close();
        await redis.quit();
    });

    beforeEach(async () => {
        // Clear all jobs before each test
        await queue.obliterate({ force: true });
        await Promise.all(workers.map(w => w.close()));
        workers = [];
    });

    it('should handle duplicate job submissions idempotently', async () => {
        const jobId = `idempotent-test-${uuidv4()}`;

        let processCount = 0;
        const worker = new Worker(TEST_QUEUE_NAME, async (job) => {
            processCount++;
            return 'done';
        }, { connection: redis });
        workers.push(worker);

        // Submit the same job ID 5 times concurrently
        await Promise.all([
            queue.add('test', { foo: 'bar' }, { jobId }),
            queue.add('test', { foo: 'bar' }, { jobId }),
            queue.add('test', { foo: 'bar' }, { jobId }),
            queue.add('test', { foo: 'bar' }, { jobId }),
            queue.add('test', { foo: 'bar' }, { jobId }),
        ]);

        // Wait a bit for processing
        await new Promise(resolve => setTimeout(resolve, 1000));

        // It should only be processed exactly once
        expect(processCount).toBe(1);
    });

    it('should handle queue flooding (200 jobs) successfully', async () => {
        const numJobs = 200;
        let processed = 0;

        const worker = new Worker(TEST_QUEUE_NAME, async (job) => {
            processed++;
            return 'done';
        }, { connection: redis, concurrency: 20 });
        workers.push(worker);

        const jobs = Array.from({ length: numJobs }).map((_, i) => ({
            name: 'flood-test',
            data: { index: i }
        }));

        await queue.addBulk(jobs);

        // Wait for all jobs to be processed
        await new Promise<void>((resolve) => {
            const check = setInterval(() => {
                if (processed === numJobs) {
                    clearInterval(check);
                    resolve();
                }
            }, 100);
        });

        expect(processed).toBe(numJobs);
    }, 15000);

    it('should validate exponential backoff and dead-letter queue (DLQ) routing', async () => {
        let attemptsObserved = 0;

        const worker = new Worker(TEST_QUEUE_NAME, async (job) => {
            attemptsObserved++;
            throw new Error('Simulated persistent failure');
        }, { connection: redis });
        workers.push(worker);

        const job = await queue.add('fail-test', { shouldFail: true });

        // Wait for it to fail its final attempt (3 attempts total based on defaultOptions)
        await new Promise<void>((resolve) => {
            queueEvents.on('failed', ({ jobId }) => {
                if (jobId === job.id) resolve();
            });
        });

        // 1 initial attempt + 2 retries = 3 attempts total
        expect(attemptsObserved).toBe(3);

        // Verify it ended up in the failed set (DLQ)
        const failedJobs = await queue.getFailed();
        expect(failedJobs.length).toBe(1);
        expect(failedJobs[0].id).toBe(job.id);
        expect(failedJobs[0].failedReason).toContain('Simulated persistent failure');
    });

    it('should recover stalled jobs if a worker crashes mid-execution', async () => {
        // In BullMQ, if a worker process dies abruptly, it stops renewing the lock.
        // Bullmq's stall checker will eventually find it and re-queue it.
        // For testing, we simulate this by creating a worker, starting a job, and immediately closing the worker mid-job.

        // Use a very short lock duration for testing stall recovery quickly
        const fastStallQueue = new Queue('stall-test-queue', { connection: redis });
        await fastStallQueue.obliterate({ force: true });

        let jobStarted = false;

        // Worker 1: Starts the job, then "crashes" (closes abruptly)
        const worker1 = new Worker('stall-test-queue', async (job) => {
            jobStarted = true;
            // Simulate crash by hanging and closing the worker from the outside
            await new Promise(resolve => setTimeout(resolve, 10000));
            return 'done';
        }, { connection: redis, lockDuration: 1000, stallInterval: 1000 }); // Fast lock expiry

        const job = await fastStallQueue.add('stall-test', { crash: true });

        // Wait for worker 1 to pick it up
        await new Promise<void>((resolve) => {
            const check = setInterval(() => {
                if (jobStarted) {
                    clearInterval(check);
                    resolve();
                }
            }, 50);
        });

        // Simulate Hard Crash (don't wait for active jobs to finish)
        await worker1.close(true);

        let recovered = false;
        // Worker 2: The recovery worker that picks up the stalled job
        const worker2 = new Worker('stall-test-queue', async (job) => {
            recovered = true;
            return 'recovered';
        }, { connection: redis, stallInterval: 1000 });
        workers.push(worker2);

        // Wait for stall checker to detect the dead lock and move it back to wait, where worker 2 picks it up
        await new Promise<void>((resolve) => {
            const check = setInterval(() => {
                if (recovered) {
                    clearInterval(check);
                    resolve();
                }
            }, 100);
        });

        expect(recovered).toBe(true);

        await fastStallQueue.close();
        await worker2.close();
    }, 15000);
});
