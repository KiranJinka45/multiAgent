import ioredis from "ioredis";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6380';
const connection = new ioredis(redisUrl);

async function checkStatus() {
    const executions = await connection.smembers('active:executions');
    console.log("Active Executions:", executions);

    for (const id of executions) {
        const data = await connection.get(`execution:${id}`);
        if (data) {
            const ctx = JSON.parse(data);
            console.log(`\n--- Execution: ${id} ---`);
            console.log(`Status: ${ctx.status}`);
            console.log(`Stage: ${ctx.currentStage}`);
            console.log(`Message: ${ctx.currentMessage || 'N/A'}`);
            if (ctx.agentResults) {
                console.log(`Results:`, Object.keys(ctx.agentResults).map(k => `${k}: ${ctx.agentResults[k].status}`));
            } else {
                console.log(`Results: None`);
            }
        }
    }

    const valWaiting = await connection.llen('bull:validator-queue:wait');
    const valActive = await connection.llen('bull:validator-queue:active');
    const repWaiting = await connection.llen('bull:repair-queue:wait');
    const repActive = await connection.llen('bull:repair-queue:active');

    console.log(`\nQueue Status:`);
    console.log(`Validator - Waiting: ${valWaiting}, Active: ${valActive}`);
    console.log(`Repair    - Waiting: ${repWaiting}, Active: ${repActive}`);

    process.exit(0);
}

checkStatus().catch(console.error);

