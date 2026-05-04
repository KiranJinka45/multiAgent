"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./pre-init");
const bullmq_1 = require("bullmq");
const agent_queues_1 = require("../lib/queue/agent-queues");
const redis_client_1 = __importDefault(require("../queue/redis-client"));
const execution_context_1 = require("../services/execution-context");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const validatorQueue = new bullmq_1.Queue(agent_queues_1.QUEUE_VALIDATOR, { connection: redis_client_1.default });
const NUM_JOBS = 20;
async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
async function run() {
    console.log(`=== TEST 8: Long-Running Worker Memory Stability ===`);
    console.log(`Enqueuing ${NUM_JOBS} jobs to monitor memory usage...\n`);
    for (let i = 1; i <= NUM_JOBS; i++) {
        const projectId = `chaos-8-memory-test-${i}`;
        const context = new execution_context_1.DistributedExecutionContext();
        const executionId = context.getExecutionId();
        // Setup sandbox
        const sandboxDir = path_1.default.join(process.cwd(), '.generated-projects', projectId);
        fs_1.default.mkdirSync(path_1.default.join(sandboxDir, 'app'), { recursive: true });
        const pageContent = `export default function Page() { return <div>Memory Test ${i}</div>; }`;
        fs_1.default.writeFileSync(path_1.default.join(sandboxDir, 'app/page.tsx'), pageContent);
        fs_1.default.writeFileSync(path_1.default.join(sandboxDir, 'package.json'), JSON.stringify({
            name: `chaos-8-app-${i}`,
            version: '1.0.0',
            scripts: { build: "echo 'build ok'" },
            dependencies: { next: "latest", react: "latest", "react-dom": "latest" }
        }, null, 2));
        // Init context
        await context.init('user-chaos-8', projectId, `Memory Stability Test ${i}`, `chaos-8-corr-${i}`);
        await context.update({
            finalFiles: [
                { path: 'app/page.tsx', content: pageContent }
            ], status: 'executing', currentStage: 'validator'
        });
        // Enqueue
        await validatorQueue.add('validate', { executionId, projectId });
        console.log(`[Job ${i}/${NUM_JOBS}] Enqueued: ${executionId}`);
        // Wait a bit between enqueues to avoid overwhelming
        await sleep(1000);
    }
    console.log(`\nAll jobs enqueued. Monitor validator_direct.log for memory stats.`);
    console.log(`Waiting 2 minutes for processing...`);
    await sleep(120000);
    console.log(`\nTest complete. Check logs for results.`);
    process.exit(0);
}
run().catch(console.error);
//# sourceMappingURL=chaos-memory-test.js.map