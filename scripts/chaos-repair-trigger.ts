import { Queue } from "bullmq";
import ioredis from "ioredis";
import * as dotenv from "dotenv";
import path from "path";
import fs from "fs-extra";

dotenv.config({ path: ".env.local" });

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6380';
console.log(`🚀 Standalone Chaos Test 2 Trigger`);
console.log(`Target Redis: ${redisUrl}`);

const redis = new ioredis(redisUrl, {
    maxRetriesPerRequest: null,
});

const projectId = "chaos-test-2-repair-test";
const executionId = "chaos-exec-" + Date.now();
const stateKey = `execution:${executionId}`;

async function run() {
    try {
        // 1. Prepare finalFiles from sandbox
        const sandboxDir = path.join(process.cwd(), '.generated-projects', projectId);
        const files = ["app/page.tsx", "app/layout.tsx", "app/globals.css", "package.json", "tsconfig.json", "tailwind.config.js"];
        const finalFiles = [];
        for (const f of files) {
            const filePath = path.join(sandboxDir, f);
            if (await fs.pathExists(filePath)) {
                const content = await fs.readFile(filePath, 'utf-8');
                finalFiles.push({ path: f, content });
            }
        }
        console.log(`Loaded ${finalFiles.length} files from ${sandboxDir}`);

        // 2. Initialize state in Redis directly
        const context = {
            executionId,
            projectId,
            userId: "standalone-chaos-user",
            prompt: "A simple broken page to test the Repair Agent.",
            correlationId: "chaos-corr-" + Date.now(),
            status: "executing",
            currentStage: "generator",
            currentMessage: "Test manually injected by standalone trigger.",
            planType: "free",
            finalFiles,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await redis.setex(stateKey, 3600 * 24, JSON.stringify(context));
        await redis.sadd('active:executions', executionId);
        console.log(`✅ Injected state into Redis at ${stateKey}`);

        // 3. Add job to validator-queue
        const validatorQueue = new Queue('validator-queue', { connection: redis });
        const job = await validatorQueue.add('verify-project', {
            projectId,
            executionId,
            prompt: context.prompt,
            strategy: "standard"
        }, {
            jobId: `val:${projectId}:${executionId}`
        });
        console.log(`✅ Added job to validator-queue: ${job.id}`);

        // 4. Watch for repairs
        console.log("Watching for state changes...");
        const interval = setInterval(async () => {
            const data = await redis.get(stateKey);
            if (data) {
                const ctx = JSON.parse(data);
                console.log(`[${new Date().toLocaleTimeString()}] Status: ${ctx.status} | Stage: ${ctx.currentStage} | Msg: ${ctx.currentMessage || '...'}`);

                if (ctx.status === 'completed') {
                    console.log("✨ SUCCESS: Repair Agent fixed the code!");
                    clearInterval(interval);
                    process.exit(0);
                } else if (ctx.status === 'failed') {
                    console.log("❌ FAILED: Pipeline failed.");
                    clearInterval(interval);
                    process.exit(1);
                }
            }
        }, 3000);

    } catch (err) {
        console.error("CRITICAL ERROR:", err);
        process.exit(1);
    }
}

run();
