"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const dotenv = __importStar(require("dotenv"));
dotenv.config({ path: ".env.local" });
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const connection = new ioredis_1.default(redisUrl);
async function checkQueue() {
    const freeQueue = new bullmq_1.Queue('project-generation-free-v1', { connection });
    const proQueue = new bullmq_1.Queue('project-generation-pro-v1', { connection });
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
//# sourceMappingURL=check-queue.js.map