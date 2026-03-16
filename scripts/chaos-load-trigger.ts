import './pre-init';
import { Queue } from 'bullmq';
import { QUEUE_VALIDATOR } from '../lib/queue/agent-queues';
import redis from '../queue/redis-client';
import { DistributedExecutionContext } from '../services/execution-context';
import path from 'path';
import fs from 'fs';

const validatorQueue = new Queue(QUEUE_VALIDATOR, { connection: redis });

const NUM_JOBS = 5;

async function run() {
    console.log(`Starting Chaos Test 6: Load + Fail with ${NUM_JOBS} concurrent jobs`);

    try {
        const jobIds: string[] = [];

        for (let i = 1; i <= NUM_JOBS; i++) {
            const projectId = `chaos-6-load-test-${i}`;

            // 1. Initialize Execution Context using the proper init() API
            const context = new DistributedExecutionContext();
            const executionId = context.getExecutionId();
            await context.init('user-chaos', projectId, `Chaos Load Test Job ${i}`, `chaos-6-corr-${i}`);

            // 2. Setup Sandbox with files
            const sandboxDir = path.join(process.cwd(), '.generated-projects', projectId);
            fs.mkdirSync(path.join(sandboxDir, 'app'), { recursive: true });

            let pageContent = `export default function Page() { return <div>Load Test ${i}</div>; }`;

            // INJECT FAILURE IN JOB 3
            if (i === 3) {
                console.log(`  >> Injecting syntax error into Job 3: ${executionId}`);
                pageContent = `export default function Page() { return <div>Broken Load Test ${i}<div>; `;
            }

            const finalFiles = [
                { path: 'app/page.tsx', content: pageContent },
                {
                    path: 'package.json', content: JSON.stringify({
                        name: `chaos-6-app-${i}`,
                        version: '1.0.0',
                        scripts: { build: "echo 'build ok'" },
                        dependencies: { next: "latest", react: "latest", "react-dom": "latest" }
                    }, null, 2)
                }
            ];

            // Write files to sandbox
            for (const f of finalFiles) {
                const fp = path.join(sandboxDir, f.path);
                fs.mkdirSync(path.dirname(fp), { recursive: true });
                fs.writeFileSync(fp, f.content);
            }

            // Store finalFiles in execution context
            await context.update({ finalFiles, status: 'executing', currentStage: 'validator' } as any);

            // 3. Enqueue to Validator
            await validatorQueue.add('validate', { executionId, projectId });

            console.log(`  Enqueued ${i}/${NUM_JOBS}: ${executionId} (Project: ${projectId})`);
            jobIds.push(executionId);
        }

        console.log(`\nAll ${NUM_JOBS} jobs enqueued. Job IDs:`);
        jobIds.forEach((id, i) => console.log(`  Job ${i + 1}: ${id}${i === 2 ? ' (BROKEN)' : ''}`));
        console.log('\nMonitor validator_worker_final.log and repair_worker_final.log for results.');

        setTimeout(() => process.exit(0), 3000);

    } catch (error) {
        console.error('Failed to trigger load test:', error);
        process.exit(1);
    }
}

run();
