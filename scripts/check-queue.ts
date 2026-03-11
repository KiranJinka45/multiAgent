import { Queue } from "bullmq";
import ioredis from "ioredis";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const connection = new ioredis(redisUrl);

async function checkQueue() {
    const freeQueue = new Queue('project-generation-free-v1', { connection });
    const proQueue = new Queue('project-generation-pro-v1', { connection });

    const [freeWaiting, freeActive, proWaiting, proActive] = await Promise.all([
        freeQueue.getWaitingCount(),
        freeQueue.getActiveCount(),
        proQueue.getWaitingCount(),
        proQueue.getActiveCount(),
    ]);

    console.log("QUEUE_STATUS_START");
    console.log(`FREE - Waiting: ${freeWaiting}, Active: ${freeActive}`);
    console.log(`PRO  - Waiting: ${proWaiting}, Active: ${proActive}`);
    console.log("QUEUE_STATUS_END");

    await connection.quit();
}

checkQueue();
