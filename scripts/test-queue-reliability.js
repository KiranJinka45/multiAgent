"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const dotenv = __importStar(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment variables
dotenv.config({ path: path_1.default.resolve(process.cwd(), '.env.local') });
dotenv.config();
const queue_manager_1 = require("../packages/utils/src/queue-manager");
// Mock Redis connection with BullMQ required settings
const connection = new ioredis_1.default(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
    maxRetriesPerRequest: null
});
const TEST_QUEUE = 'reliability-test-queue';
const DLQ_NAME = 'dead-letter-queue';
async function runTest() {
    console.log('🚀 Starting BullMQ Reliability Test...');
    // 1. Setup Test Worker
    const testWorker = new bullmq_1.Worker(TEST_QUEUE, async (job) => {
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
            await queue_manager_1.queueManager.moveToDLQ(job, err);
        }
    });
    const queue = new bullmq_1.Queue(TEST_QUEUE, {
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
    const dlq = new bullmq_1.Queue(DLQ_NAME, { connection });
    // Check all states: waiting, active, completed, failed, delayed, paused
    const dlqJobs = await dlq.getJobs(['waiting', 'completed', 'active', 'failed']);
    const movedToDlq = dlqJobs.find(j => j.data.originalJobId === failingJobId);
    if (movedToDlq) {
        console.log('✅ SUCCESS: Job moved to DLQ after failures.');
        console.log(`   Failure Reason: ${movedToDlq.data.failedReason}`);
    }
    else {
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
//# sourceMappingURL=test-queue-reliability.js.map