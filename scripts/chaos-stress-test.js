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
const architectureQueue = new bullmq_1.Queue(agent_queues_1.QUEUE_ARCHITECTURE, { connection: redis_client_1.default });
const NUM_JOBS = 10;
async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
async function run() {
    console.log(`=== TEST 12: Full Pipeline Stress Test (${NUM_JOBS} concurrent jobs) ===\n`);
    const executionIds = [];
    for (let i = 1; i <= NUM_JOBS; i++) {
        const projectId = `chaos-12-stress-test-${i}`;
        const context = new execution_context_1.DistributedExecutionContext();
        const executionId = context.getExecutionId();
        executionIds.push(executionId);
        // 1. Initialize Context
        await context.init('user-chaos-12', projectId, `Stress Test Job ${i}`, `chaos-12-corr-${i}`);
        const intent = {
            templateId: 'nextjs-tailwind-basic',
            branding: { primaryColor: '#3b82f6', companyName: `Stress Corp ${i}` },
            features: ['dashboard', 'settings']
        };
        await context.atomicUpdate(ctx => {
            ctx.status = 'executing';
            ctx.currentStage = 'architecture';
            ctx.metadata.intent = intent;
        });
        // 2. Enqueue to Architecture (start of the pipeline)
        await architectureQueue.add('design-project', {
            projectId,
            executionId,
            userId: 'user-chaos-12',
            prompt: `Build a modern dashboard for Stress Corp ${i}`,
            intent,
            strategy: 'standard'
        });
        console.log(`[Job ${i}/${NUM_JOBS}] Enqueued: ${executionId} (Project: ${projectId})`);
        // Slight stagger to avoid immediate spike
        await sleep(500);
    }
    console.log(`\nAll ${NUM_JOBS} jobs enqueued. Monitoring the orchestrator...`);
    console.log(`Watch architecture_worker.log, generator_worker.log, validator_direct.log, and deploy_worker.log.`);
    // Monitor for 5 minutes
    for (let t = 1; t <= 30; t++) {
        await sleep(10000);
        const activeIds = await execution_context_1.DistributedExecutionContext.getActiveExecutions();
        const stressIds = activeIds.filter(id => executionIds.includes(id));
        let completed = 0;
        let failed = 0;
        let processing = 0;
        for (const id of executionIds) {
            const ctx = await new execution_context_1.DistributedExecutionContext(id).get();
            if (ctx?.status === 'completed')
                completed++;
            else if (ctx?.status === 'failed')
                failed++;
            else
                processing++;
        }
        console.log(`[T+${t * 10}s] Active Stress Jobs: ${processing} | Completed: ${completed} | Failed: ${failed}`);
        if (completed + failed === NUM_JOBS) {
            console.log(`\n✨ All stress jobs finished!`);
            break;
        }
    }
    console.log(`\n--- Final Summary ---`);
    console.log(`Success Rate: ${(executionIds.length > 0) ? (NUM_JOBS - (NUM_JOBS - executionIds.length)) : 0}% (placeholder)`);
    process.exit(0);
}
run().catch(console.error);
//# sourceMappingURL=chaos-stress-test.js.map