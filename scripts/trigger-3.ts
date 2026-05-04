import { Queue } from "bullmq";
import Redis from "ioredis";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: null,
});

async function trigger() {
    const projectId = "9a4b7634-ab3f-43cd-8230-f0ab875820c9";
    const userId = "024e8e19-03b0-466d-8951-87a17387cc2a";
    const executionId = "exec-final-" + Date.now();
    const prompt = "A futuristic dashboard for monitoring Mars colony life support systems, using translucent glassmorphism effects and radial charts.";

    console.log(`🚀 Orchestrating build ${executionId}...`);

    const freeQueue = new Queue("project-generation-free-v1", { connection: redis });
    await freeQueue.add("generate-project", {
        projectId,
        userId,
        executionId,
        prompt
    }, {
        jobId: `gen:${projectId}:${executionId}`
    });

    console.log("✅ Dispatched to grid cluster.");
    process.exit(0);
}

trigger().catch(console.error);

