"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishLog = publishLog;
const utils_1 = require("@packages/utils");
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(REDIS_URL);
async function publishLog(buildId, message, level = 'info') {
    const logEntry = {
        buildId,
        message,
        level,
        timestamp: new Date().toISOString()
    };
    utils_1.logger.info({ buildId, message }, '[WorkerLogger] Publishing log');
    try {
        await redis.publish('build-logs', JSON.stringify(logEntry));
    }
    catch (err) {
        utils_1.logger.error({ err }, '[WorkerLogger] Failed to publish log to Redis');
    }
}
//# sourceMappingURL=logger.js.map