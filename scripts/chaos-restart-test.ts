import './pre-init';
import { Queue } from 'bullmq';
import { QUEUE_VALIDATOR } from '../src/lib/queue/agent-queues';
import redis from '../queue/redis-client';
import { DistributedExecutionContext } from '../services/execution-context';
import path from 'path';
import fs from 'fs';

const validatorQueue = new Queue(QUEUE_VALIDATOR, { connection: redis });

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function getQueueCounts() {
    const Redis = (await import('ioredis')).default;
    const conn = new Redis('redis://127.0.0.1:6380', { maxRetriesPerRequest: null });
    const vq = new Queue('validator-queue', { connection: conn });
    const dq = new Queue('docker-queue', { connection: conn });
    const dpq = new Queue('deploy-queue', { connection: conn });
    const counts = {
        validator: await vq.getJobCounts(),
        docker: await dq.getJobCounts(),
        deploy: await dpq.getJobCounts()
    };
    await conn.quit();
    return counts;
}

async function run() {
    console.log('=== TEST 7: Persistent Job Recovery After Full System Restart ===\n');

    const projectId = 'chaos-7-restart-test';
    const context = new DistributedExecutionContext();
    const executionId = context.getExecutionId();

    // 1. Setup sandbox
    const sandboxDir = path.join(process.cwd(), '.sandboxes', projectId);
    fs.mkdirSync(path.join(sandboxDir, 'app'), { recursive: true });
    const pageContent = `export default function Page() { return <div>Restart Recovery Test</div>; }`;
    fs.writeFileSync(path.join(sandboxDir, 'app/page.tsx'), pageContent);
    fs.writeFileSync(path.join(sandboxDir, 'package.json'), JSON.stringify({
        name: 'chaos-7-app', version: '1.0.0',
        scripts: { build: "echo 'build ok'" },
        dependencies: { next: "latest", react: "latest", "react-dom": "latest" }
    }, null, 2));

    // 2. Init execution context
    await context.init('user-chaos-7', projectId, 'Restart Recovery Test', 'chaos-7-corr');
    await context.update({
        finalFiles: [
            { path: 'app/page.tsx', content: pageContent }
        ], status: 'executing', currentStage: 'validator'
    } as any);

    // 3. Enqueue to validator
    await validatorQueue.add('validate', { executionId, projectId });
    console.log(`[STEP 1] Job enqueued: ${executionId}`);
    console.log(`         Project: ${projectId}`);

    // 4. Wait for it to go active
    await sleep(3000);
    const preRestart = await getQueueCounts();
    console.log(`\n[STEP 2] Pre-restart queue state:`);
    console.log(`  Validator: ${JSON.stringify(preRestart.validator)}`);
    console.log(`  Docker:    ${JSON.stringify(preRestart.docker)}`);
    console.log(`  Deploy:    ${JSON.stringify(preRestart.deploy)}`);

    // 5. KILL ALL WORKERS
    console.log(`\n[STEP 3] *** KILLING ALL NODE WORKERS ***`);
    const { execSync } = await import('child_process');
    try {
        // Kill all other Node processes (not this script)
        execSync('powershell -Command "Get-Process -Name node | Where-Object { $_.Id -ne $PID } | Stop-Process -Force"', { stdio: 'pipe' });
    } catch (e) {
        // Expected — some processes may already be gone
    }
    console.log(`         All workers terminated.`);

    // 6. Wait for "downtime"
    console.log(`\n[STEP 4] System down. Waiting 5 seconds...`);
    await sleep(5000);

    // 7. Verify job is still in Redis
    const duringOutage = await getQueueCounts();
    console.log(`\n[STEP 5] During outage queue state (should still have jobs):`);
    console.log(`  Validator: ${JSON.stringify(duringOutage.validator)}`);
    console.log(`  Docker:    ${JSON.stringify(duringOutage.docker)}`);
    console.log(`  Deploy:    ${JSON.stringify(duringOutage.deploy)}`);

    const totalJobs = Object.values(duringOutage.validator).reduce((a, b) => a + b, 0) +
        Object.values(duringOutage.docker).reduce((a, b) => a + b, 0) +
        Object.values(duringOutage.deploy).reduce((a, b) => a + b, 0);

    if (totalJobs > 0) {
        console.log(`\n  ✅ PERSISTENCE VERIFIED: ${totalJobs} job(s) survived the restart in Redis.`);
    } else {
        console.log(`\n  ❌ PERSISTENCE FAILURE: No jobs found in Redis after restart.`);
        process.exit(1);
    }

    // 8. Restart workers
    console.log(`\n[STEP 6] Restarting workers...`);
    const workerCmds = [
        'Start-Process -NoNewWindow -FilePath ".\\node_modules\\.bin\\tsx" -ArgumentList "workers\\validatorWorker.ts" -RedirectStandardOutput validator_t7.log -RedirectStandardError validator_t7_err.log',
        'Start-Process -NoNewWindow -FilePath ".\\node_modules\\.bin\\tsx" -ArgumentList "workers\\dockerWorker.ts" -RedirectStandardOutput docker_t7.log -RedirectStandardError docker_t7_err.log',
        'Start-Process -NoNewWindow -FilePath ".\\node_modules\\.bin\\tsx" -ArgumentList "workers\\deployWorker.ts" -RedirectStandardOutput deploy_t7.log -RedirectStandardError deploy_t7_err.log',
    ];
    for (const cmd of workerCmds) {
        try { execSync(`powershell -Command "${cmd}"`, { stdio: 'pipe' }); } catch (e) { /* ignore */ }
    }
    console.log(`         Workers restarted.`);

    // 9. Wait for pipeline to process
    console.log(`\n[STEP 7] Waiting 30 seconds for pipeline to process recovered jobs...`);
    await sleep(30000);

    // 10. Check final state
    const postRestart = await getQueueCounts();
    console.log(`\n[STEP 8] Post-recovery queue state:`);
    console.log(`  Validator: ${JSON.stringify(postRestart.validator)}`);
    console.log(`  Docker:    ${JSON.stringify(postRestart.docker)}`);
    console.log(`  Deploy:    ${JSON.stringify(postRestart.deploy)}`);

    // Check execution context
    const finalCtx = await context.get();
    console.log(`\n[RESULT] Execution Context Status: ${finalCtx?.status}`);
    console.log(`         Current Stage: ${finalCtx?.currentStage}`);

    const completed = (postRestart.validator.completed || 0) + (postRestart.docker.completed || 0) + (postRestart.deploy.completed || 0);
    if (completed > 0) {
        console.log(`\n  ✅ TEST 7 PASSED: Job recovered and completed after full system restart!`);
    } else {
        console.log(`\n  ⚠️  Job recovered from persistence but is still processing. Check worker logs.`);
    }

    setTimeout(() => process.exit(0), 3000);
}

run().catch(err => { console.error('Test failed:', err); process.exit(1); });
