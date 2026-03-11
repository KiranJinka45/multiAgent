import './pre-init';
import { Queue } from 'bullmq';
import { QUEUE_VALIDATOR } from '../lib/queue/agent-queues';
import redis from '../queue/redis-client';
import { DistributedExecutionContext } from '../services/execution-context';
import path from 'path';
import fs from 'fs';

const validatorQueue = new Queue(QUEUE_VALIDATOR, { connection: redis });

const NUM_JOBS = 20;

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
    console.log(`=== TEST 8: Long-Running Worker Memory Stability ===`);
    console.log(`Enqueuing ${NUM_JOBS} jobs to monitor memory usage...\n`);

    for (let i = 1; i <= NUM_JOBS; i++) {
        const projectId = `chaos-8-memory-test-${i}`;
        const context = new DistributedExecutionContext();
        const executionId = context.getExecutionId();

        // Setup sandbox
        const sandboxDir = path.join(process.cwd(), '.sandboxes', projectId);
        fs.mkdirSync(path.join(sandboxDir, 'app'), { recursive: true });
        const pageContent = `export default function Page() { return <div>Memory Test ${i}</div>; }`;
        fs.writeFileSync(path.join(sandboxDir, 'app/page.tsx'), pageContent);
        fs.writeFileSync(path.join(sandboxDir, 'package.json'), JSON.stringify({
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
        } as any);

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
