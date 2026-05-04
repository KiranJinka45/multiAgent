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
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
dotenv.config({ path: ".env.local" });
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6380';
console.log(`🚀 Standalone Chaos Test 2 Trigger`);
console.log(`Target Redis: ${redisUrl}`);
const redis = new ioredis_1.default(redisUrl, {
    maxRetriesPerRequest: null,
});
const projectId = "chaos-test-2-repair-test";
const executionId = "chaos-exec-" + Date.now();
const stateKey = `execution:${executionId}`;
async function run() {
    try {
        // 1. Prepare finalFiles from sandbox
        const sandboxDir = path_1.default.join(process.cwd(), '.generated-projects', projectId);
        const files = ["app/page.tsx", "app/layout.tsx", "app/globals.css", "package.json", "tsconfig.json", "tailwind.config.js"];
        const finalFiles = [];
        for (const f of files) {
            const filePath = path_1.default.join(sandboxDir, f);
            if (await fs_extra_1.default.pathExists(filePath)) {
                const content = await fs_extra_1.default.readFile(filePath, 'utf-8');
                finalFiles.push({ path: f, content });
            }
        }
        console.log(`Loaded ${finalFiles.length} files from ${sandboxDir}`);
        // 2. Initialize state in Redis directly
        const context = {
            executionId,
            projectId,
            userId: "standalone-chaos-user",
            prompt: "A simple broken page to test the Repair Agent.",
            correlationId: "chaos-corr-" + Date.now(),
            status: "executing",
            currentStage: "generator",
            currentMessage: "Test manually injected by standalone trigger.",
            planType: "free",
            finalFiles,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        await redis.setex(stateKey, 3600 * 24, JSON.stringify(context));
        await redis.sadd('active:executions', executionId);
        console.log(`✅ Injected state into Redis at ${stateKey}`);
        // 3. Add job to validator-queue
        const validatorQueue = new bullmq_1.Queue('validator-queue', { connection: redis });
        const job = await validatorQueue.add('verify-project', {
            projectId,
            executionId,
            prompt: context.prompt,
            strategy: "standard"
        }, {
            jobId: `val:${projectId}:${executionId}`
        });
        console.log(`✅ Added job to validator-queue: ${job.id}`);
        // 4. Watch for repairs
        console.log("Watching for state changes...");
        const interval = setInterval(async () => {
            const data = await redis.get(stateKey);
            if (data) {
                const ctx = JSON.parse(data);
                console.log(`[${new Date().toLocaleTimeString()}] Status: ${ctx.status} | Stage: ${ctx.currentStage} | Msg: ${ctx.currentMessage || '...'}`);
                if (ctx.status === 'completed') {
                    console.log("✨ SUCCESS: Repair Agent fixed the code!");
                    clearInterval(interval);
                    process.exit(0);
                }
                else if (ctx.status === 'failed') {
                    console.log("❌ FAILED: Pipeline failed.");
                    clearInterval(interval);
                    process.exit(1);
                }
            }
        }, 3000);
    }
    catch (err) {
        console.error("CRITICAL ERROR:", err);
        process.exit(1);
    }
}
run();
//# sourceMappingURL=chaos-repair-trigger.js.map