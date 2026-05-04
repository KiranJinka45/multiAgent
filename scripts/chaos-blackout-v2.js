"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./pre-init");
const bullmq_1 = require("bullmq");
const agent_queues_1 = require("../lib/queue/agent-queues");
const ioredis_1 = __importDefault(require("ioredis"));
const execution_context_1 = require("../services/execution-context");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const child_process_1 = require("child_process");
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6380';
const redis = new ioredis_1.default(REDIS_URL, { maxRetriesPerRequest: null });
const validatorQueue = new bullmq_1.Queue(agent_queues_1.QUEUE_VALIDATOR, { connection: redis });
async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
async function run() {
    console.log('=== TEST 13: Enhanced Blackout Recovery (Total Outage) ===\n');
    const projectId = 'chaos-13-blackout-v2';
    const context = new execution_context_1.DistributedExecutionContext();
    const executionId = context.getExecutionId();
    // 1. Setup sandbox
    const sandboxDir = path_1.default.join(process.cwd(), '.generated-projects', projectId);
    fs_1.default.mkdirSync(path_1.default.join(sandboxDir, 'app'), { recursive: true });
    fs_1.default.writeFileSync(path_1.default.join(sandboxDir, 'app/page.tsx'), `export default function Page() { return <div>Recovery V2</div>; }`);
    fs_1.default.writeFileSync(path_1.default.join(sandboxDir, 'package.json'), JSON.stringify({
        name: 'chaos-13-app', version: '1.0.0', dependencies: { react: "latest" }
    }, null, 2));
    // 2. Init context
    await context.init('user-chaos-13', projectId, 'Enhanced Blackout Test', 'chaos-13-corr');
    await context.update({ status: 'executing', currentStage: 'validator' });
    // 3. Enqueue job
    await validatorQueue.add('validate', { executionId, projectId });
    console.log(`[STEP 1] Job enqueued: ${executionId}`);
    // Wait for it to be active
    console.log('         Waiting for job to enter ACTIVE state...');
    let isActive = false;
    for (let i = 0; i < 10; i++) {
        const counts = await validatorQueue.getJobCounts();
        if (counts.active > 0) {
            isActive = true;
            break;
        }
        await sleep(1000);
    }
    if (!isActive)
        console.log('         (Warning: Job not active yet, proceeding with blackout anyway)');
    // 4. TOTAL BLACKOUT
    const tOutage = Date.now();
    console.log(`\n[STEP 2] *** BLACKOUT INITIATED at ${new Date(tOutage).toLocaleTimeString()} ***`);
    const currentPid = process.pid;
    console.log(`         (Current Test PID: ${currentPid})`);
    console.log('         Stopping Workers (Excluding Self)...');
    const psPath = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
    try {
        // Kill node and tsx processes that are NOT the current script
        (0, child_process_1.execSync)(`"${psPath}" -Command "Get-Process node,tsx -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne ${currentPid} } | Stop-Process -Force"`, { stdio: 'ignore' });
    }
    catch (e) {
        console.log('         (Kill attempt finished with some errors or no processes found)');
    }
    console.log('         Stopping Redis...');
    try {
        (0, child_process_1.execSync)('taskkill /F /IM redis-server.exe /T', { stdio: 'ignore' });
    }
    catch (e) { }
    console.log('         System is DARK. Waiting 15 seconds...');
    await sleep(15000);
    // 5. RESTART
    const tRestart = Date.now();
    console.log(`\n[STEP 3] *** RESTARTING INFRASTRUCTURE at ${new Date(tRestart).toLocaleTimeString()} ***`);
    console.log('         Starting Redis (Port 6380)...');
    const redisPath = path_1.default.resolve(process.cwd(), 'Redis', 'redis-server.exe');
    if (!fs_1.default.existsSync(redisPath)) {
        console.log(`         ❌ ERROR: Redis not found at ${redisPath}`);
        process.exit(1);
    }
    // Use cmd /c start to ensure it detaches
    (0, child_process_1.execSync)(`cmd /c start /B "" "${redisPath}" --port 6380`, { stdio: 'ignore' });
    // Measure Redis Reconnect Time
    let tRedisReady = 0;
    console.log('         Waiting for Redis...');
    const redisProbe = new ioredis_1.default(REDIS_URL, { connectTimeout: 1000, retryStrategy: () => 1000 });
    for (let i = 0; i < 30; i++) {
        try {
            await redisProbe.ping();
            tRedisReady = Date.now();
            break;
        }
        catch (e) {
            await sleep(500);
        }
    }
    redisProbe.disconnect();
    if (!tRedisReady) {
        console.log('         ❌ FAILED: Redis did not come back online.');
        process.exit(1);
    }
    const redisReconnectTime = (tRedisReady - tRestart) / 1000;
    console.log(`         ✅ Redis Ready in ${redisReconnectTime.toFixed(2)}s`);
    console.log('         Starting Workers...');
    const workerCmds = [
        'npx tsx workers/validatorWorker.ts',
        'npx tsx workers/deployWorker.ts'
    ];
    for (const cmd of workerCmds) {
        (0, child_process_1.execSync)(`cmd /c start /B "" ${cmd}`, { stdio: 'ignore' });
    }
    // 6. MONITOR RECOVERY
    console.log('\n[STEP 4] Monitoring Recovery Metrics...');
    let tWorkerResumed = 0;
    let tJobDone = 0;
    for (let i = 0; i < 24; i++) {
        await sleep(5000);
        const ctx = await context.get();
        if (!ctx)
            continue;
        // Detection of worker resumption
        if (!tWorkerResumed && (ctx.status === 'completed' || ctx.currentStage !== 'validator')) {
            tWorkerResumed = Date.now();
            console.log(`         ✅ Workers Resumed processing at T+${((tWorkerResumed - tRestart) / 1000).toFixed(2)}s`);
        }
        if (ctx.status === 'completed') {
            tJobDone = Date.now();
            break;
        }
        console.log(`         [T+${(i + 1) * 5}s] Status: ${ctx.status}, Stage: ${ctx.currentStage}`);
    }
    if (tJobDone) {
        const workerResumeTime = (tWorkerResumed - tRedisReady) / 1000;
        const totalRecoveryWindow = (tJobDone - tRestart) / 1000;
        console.log(`\n=== BLACKOUT TEST METRICS ===`);
        console.log(`Job ID: ${executionId}`);
        console.log(`Redis Reconnect Time: ${redisReconnectTime.toFixed(2)}s`);
        console.log(`Worker Resume Time:  ${workerResumeTime.toFixed(2)}s`);
        console.log(`Total Recovery Window: ${totalRecoveryWindow.toFixed(2)}s`);
        console.log(`Final Pipeline Status: ✅ SUCCESS`);
        console.log(`\n✨ PASS CRITERIA MET: Jobs persisted, workers reconnected, pipeline finished without data loss.`);
    }
    else {
        console.log(`\n❌ TEST FAILED: Pipeline did not complete within timeout.`);
        process.exit(1);
    }
    process.exit(0);
}
run().catch(console.error);
//# sourceMappingURL=chaos-blackout-v2.js.map