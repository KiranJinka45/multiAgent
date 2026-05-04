"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishLog = publishLog;
const ioredis_1 = __importDefault(require("ioredis"));
const redis = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379');
/**
 * Publishes a log message for a specific project to Redis.
 * This will be picked up by the API gateway and broadcast to connected clients via Socket.io.
 */
async function publishLog(projectId, message, type = 'info') {
    try {
        await redis.publish(`logs:${projectId}`, JSON.stringify({
            message,
            type,
            timestamp: new Date().toISOString(),
        }));
    }
    catch (err) {
        console.error(`Failed to publish log for project ${projectId}:`, err);
    }
}
//# sourceMappingURL=logPublisher.js.map