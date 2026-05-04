"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const ioredis_1 = __importDefault(require("ioredis"));
async function check() {
    console.log('Connecting to:', process.env.REDIS_URL || 'redis://127.0.0.1:6379');
    const redis = new ioredis_1.default(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
        maxRetriesPerRequest: 1,
        connectTimeout: 5000
    });
    redis.on('error', (err) => console.error('Redis Error:', err.message));
    redis.on('connect', () => console.log('Redis Connected!'));
    try {
        await redis.ping();
        console.log('PING successful!');
    }
    catch (err) {
        console.error('PING failed:', err.message);
    }
    finally {
        await redis.quit();
    }
}
check();
//# sourceMappingURL=check-redis.js.map