"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// tests/p20/monitor.ts
const os_1 = __importDefault(require("os"));
const ioredis_1 = __importDefault(require("ioredis"));
// Config
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
// 1. Resource Monitor (CPU/Memory)
setInterval(() => {
    const mem = process.memoryUsage();
    const cpu = os_1.default.loadavg()[0];
    console.log(JSON.stringify({
        type: "METRIC_RESOURCE",
        timestamp: new Date().toISOString(),
        heapUsedMB: (mem.heapUsed / 1024 / 1024).toFixed(2),
        heapTotalMB: (mem.heapTotal / 1024 / 1024).toFixed(2),
        rssMB: (mem.rss / 1024 / 1024).toFixed(2),
        cpuLoad: cpu.toFixed(2)
    }));
}, 60000); // Sample every minute
// 2. Redis Monitor
const redis = new ioredis_1.default(REDIS_URL);
redis.on("error", (err) => {
    console.error(JSON.stringify({ type: "ERROR_REDIS", error: err.message }));
});
setInterval(async () => {
    try {
        const info = await redis.info("clients");
        const stats = await redis.info("memory");
        // Extract connected clients and memory usage
        const connectedClients = info.split("\n").find(line => line.startsWith("connected_clients:"))?.split(":")[1].trim();
        const usedMemory = stats.split("\n").find(line => line.startsWith("used_memory_human:"))?.split(":")[1].trim();
        console.log(JSON.stringify({
            type: "METRIC_REDIS",
            timestamp: new Date().toISOString(),
            connectedClients,
            usedMemory
        }));
    }
    catch (e) {
        console.error(JSON.stringify({ type: "ERROR_REDIS_MONITOR", error: e.message }));
    }
}, 60000); // Sample every minute
console.log(`🧠 Resource & Redis Monitor active (Logging to stdout)`);
//# sourceMappingURL=monitor.js.map