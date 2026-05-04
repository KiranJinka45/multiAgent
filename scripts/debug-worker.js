"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
require("dotenv/config");
const redis = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
});
async function processJob(job) {
    console.log('🚀 [DEBUG] PICKED UP JOB:', job.id);
    console.log('📦 Data:', JSON.stringify(job.data, null, 2));
    // Simulate work
    for (let i = 0; i <= 100; i += 20) {
        console.log(`⏳ Progress: ${i}%`);
        await job.updateProgress(i);
        await new Promise(r => setTimeout(r, 1000));
    }
    return { success: true, result: 'Completed manually' };
}
async function main() {
    const queueName = 'free_queue';
    console.log(`🤖 Starting debug worker for queue: ${queueName}`);
    const worker = new bullmq_1.Worker(queueName, processJob, {
        connection: redis,
        concurrency: 1
    });
    worker.on('completed', (job) => console.log(`✅ Job ${job.id} completed`));
    worker.on('failed', (job, err) => console.error(`❌ Job ${job?.id} failed:`, err));
    console.log('📡 Listening for jobs...');
}
main().catch(console.error);
//# sourceMappingURL=debug-worker.js.map