import './pre-init';
import { Queue } from 'bullmq';
import { QUEUE_VALIDATOR } from '../lib/queue/agent-queues';
import redis from '../queue/redis-client';
import { DistributedExecutionContext } from '../services/execution-context';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

const validatorQueue = new Queue(QUEUE_VALIDATOR, { connection: redis });

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
    console.log('=== TEST 10: Integrated Blackout Recovery (Total Outage) ===\n');

    const projectId = 'chaos-10-blackout-test';
    const context = new DistributedExecutionContext();
    const executionId = context.getExecutionId();

    // 1. Setup sandbox
    const sandboxDir = path.join(process.cwd(), '.sandboxes', projectId);
    if (!fs.existsSync(sandboxDir)) {
        fs.mkdirSync(path.join(sandboxDir, 'app'), { recursive: true });
        const pageContent = `export default function Page() { return <div>Blackout Recovery Test</div>; }`;
        fs.writeFileSync(path.join(sandboxDir, 'app/page.tsx'), pageContent);
        fs.writeFileSync(path.join(sandboxDir, 'package.json'), JSON.stringify({
            name: 'chaos-10-app', version: '1.0.0',
            scripts: { build: "echo 'build ok'" },
            dependencies: { react: "latest" }
        }, null, 2));
    }

    // 2. Init context
    await context.init('user-chaos-10', projectId, 'Blackout Recovery Test', 'chaos-10-corr');
    await context.update({
        status: 'executing', currentStage: 'validator'
    } as any);

    // 3. Enqueue job
    await validatorQueue.add('validate', { executionId, projectId });
    console.log(`[STEP 1] Job enqueued: ${executionId}`);

    // 4. KILL EVERYTHING
    console.log(`\n[STEP 2] *** INITIATING TOTAL INFRASTRUCTURE BLACKOUT ***`);
    console.log(`         Killing Workers...`);
    try {
        execSync('powershell -Command "Get-Process -Name node | Where-Object { $_.Id -ne $PID } | Stop-Process -Force"', { stdio: 'pipe' });
    } catch (e) { }

    console.log(`         Killing Socket Server (if running)...`);
    // Socket server usually runs via tsx or node as well

    console.log(`         Note: This script cannot kill Redis without root/admin, so we assume system-level recovery for Redis persistence.`);
    console.log(`         System is now DARK.`);

    // 5. Wait in the dark
    await sleep(10000);

    // 6. Recovery
    console.log(`\n[STEP 3] *** INITIATING RECOVERY ***`);
    console.log(`         Restarting workers...`);
    const workerCmds = [
        'Start-Process -NoNewWindow -FilePath ".\\node_modules\\.bin\\tsx" -ArgumentList "workers\\validatorWorker.ts" -RedirectStandardOutput validator_t10.log -RedirectStandardError validator_t10_err.log',
        'Start-Process -NoNewWindow -FilePath ".\\node_modules\\.bin\\tsx" -ArgumentList "workers\\dockerWorker.ts" -RedirectStandardOutput docker_t10.log -RedirectStandardError docker_t10_err.log',
    ];
    for (const cmd of workerCmds) {
        try { execSync(`powershell -Command "${cmd}"`, { stdio: 'pipe' }); } catch (e) { }
    }

    // 7. Watch for completion
    console.log(`\n[STEP 4] Monitoring for job recovery and completion (60s timeout)...`);
    let recovered = false;
    for (let i = 0; i < 12; i++) {
        await sleep(5000);
        const ctx = await context.get();
        console.log(`         [T+${(i + 1) * 5}s] Status: ${ctx?.status}, Stage: ${ctx?.currentStage}`);
        if (ctx?.status === 'completed' || ctx?.currentStage === 'deploy') {
            recovered = true;
            break;
        }
    }

    if (recovered) {
        console.log(`\n  ✅ TEST 10 PASSED: System recovered from blackout and resumed job execution!`);
    } else {
        console.log(`\n  ❌ TEST 10 FAILED: Job did not resume after blackout recovery.`);
        process.exit(1);
    }

    process.exit(0);
}

run().catch(console.error);
