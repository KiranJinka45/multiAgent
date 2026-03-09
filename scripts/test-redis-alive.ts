import ioredis from "ioredis";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6380';
console.log(`Connecting to ${redisUrl}...`);

const redis = new ioredis(redisUrl);

redis.on('connect', () => console.log("CONNECTED"));
redis.on('ready', () => console.log("READY"));
redis.on('error', (err) => console.log("ERROR", err.message));

console.log("Setting interval...");
setInterval(() => {
    console.log("Heartbeat " + new Date().toLocaleTimeString());
}, 5000);
