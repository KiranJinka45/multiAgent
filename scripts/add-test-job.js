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
async function main() {
    console.log('🚀 Adding test job to free_queue...');
    const queue = new bullmq_1.Queue('free_queue', { connection: redis });
    const job = await queue.add('build:init', {
        missionId: 'manual_test_' + Date.now(),
        prompt: 'Manual test prompt'
    });
    console.log('✅ Job added:', job.id);
    process.exit(0);
}
main().catch(console.error);
//# sourceMappingURL=add-test-job.js.map