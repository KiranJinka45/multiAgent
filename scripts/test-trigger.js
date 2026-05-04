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
dotenv.config({ path: '.env.local' });
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
async function trigger() {
    const projectId = process.argv[2];
    if (!projectId) {
        console.error('Please provide a projectId as an argument.');
        process.exit(1);
    }
    const executionId = `test-exec-${Date.now()}`;
    const userId = "bfad-407a-86ce-4bb6d45acc51"; // Default test user
    const prompt = "Build a modern fitness landing page with a hero section, features, and pricing table using Tailwind CSS and Next.js.";
    console.log(`Triggering mission for Project: ${projectId}, Execution: ${executionId}`);
    const connection = new ioredis_1.default(redisUrl, { maxRetriesPerRequest: null });
    // Create Mission first
    const mission = {
        id: executionId,
        projectId,
        userId,
        prompt,
        status: 'draft',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: { fastPath: true }
    };
    await connection.setex(`mission:${executionId}`, 86400, JSON.stringify(mission));
    console.log(`Mission created in Redis: mission:${executionId}`);
    const queue = new bullmq_1.Queue('project-generation-free-v1', { connection });
    await queue.add('generate-project', {
        prompt,
        userId,
        projectId,
        executionId
    }, {
        jobId: `gen:${projectId}:${executionId}`,
        removeOnComplete: true
    });
    console.log(`Job added to queue. Monitor with: redis-cli get mission:${executionId}`);
    // Watch status
    console.log('Watching status (Ctrl+C to stop)...');
    while (true) {
        const data = await connection.get(`mission:${executionId}`);
        if (data) {
            const mission = JSON.parse(data);
            console.log(`[${new Date().toISOString()}] Status: ${mission.status}`);
            if (['completed', 'failed'].includes(mission.status))
                break;
        }
        await new Promise(r => setTimeout(r, 2000));
    }
    await connection.quit();
}
trigger().catch(console.error);
//# sourceMappingURL=test-trigger.js.map