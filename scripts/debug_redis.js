"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ioredis_1 = __importDefault(require("ioredis"));
const redis = new ioredis_1.default('redis://localhost:6379', {
    connectTimeout: 2000,
    maxRetriesPerRequest: 0
});
redis.on('error', (err) => {
    console.error('Redis connection failed:', err.message);
    process.exit(1);
});
redis.ping().then((res) => {
    console.log('Redis PING response:', res);
    process.exit(0);
}).catch((err) => {
    console.error('Redis connection failed:', err.message);
    process.exit(1);
});
//# sourceMappingURL=debug_redis.js.map