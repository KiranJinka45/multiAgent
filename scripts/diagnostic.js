const Redis = require('ioredis');
const { execSync } = require('child_process');

async function checkDiagnostics() {
    console.log("=== Build Pipeline Diagnostic Report ===");

    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    console.log(`Connecting to Redis: ${redisUrl}...`);
    const redis = new Redis(redisUrl, { connectTimeout: 2000 });

    try {
        await redis.ping();
        console.log("✅ Redis: Connected");

        // 1. Check Worker Heartbeat
        const workerHealth = await redis.get('system:health:worker');
        if (workerHealth) {
            const health = JSON.parse(workerHealth);
            const age = Math.round((Date.now() - health.lastSeen) / 1000);
            console.log(`✅ Worker: Active (Last seen ${age}s ago)`);
            console.log(`   Concurrency: Free=${health.freeConcurrency}, Pro=${health.proConcurrency}`);
        } else {
            console.log("❌ Worker: OFFLINE (No heartbeat found in Redis)");
        }

        // 2. Check Job Counts
        const queues = [
            'meta-agent-queue',
            'planner-queue',
            'architecture-queue',
            'generator-queue',
            'validator-queue',
            'repair-queue',
            'docker-queue',
            'deploy-queue',
            'supervisor-queue'
        ];

        for (const q of queues) {
            const waiting = await redis.llen(`bull:${q}:wait`);
            const active = await redis.scard(`bull:${q}:active`);
            const stalled = await redis.scard(`bull:${q}:stalled`);

            console.log(`\nQueue: ${q}`);
            console.log(`   Waiting: ${waiting} ${waiting > 0 ? '⚠️' : '✅'}`);
            console.log(`   Active:  ${active}`);
            console.log(`   Stalled: ${stalled} ${stalled > 0 ? '❌' : '✅'}`);
        }

        // 3. Check for Socket Server
        console.log("\nChecking for running Node processes...");
        try {
            const isWin = process.platform === 'win32';
            const cmd = isWin 
                ? 'powershell "Get-Process node -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id"' 
                : 'pgrep node';
            
            const processes = execSync(cmd, { encoding: 'utf8' });
            const nodeCount = (processes.trim().split('\n').filter(line => line.trim().length > 0) || []).length;
            console.log(`Found ${nodeCount} Node.js processes running.`);
        } catch (e) {
            console.log("No Node.js processes found or unable to list.");
        }

    } catch (e) {
        console.error("❌ Redis: Connection Failed", e.message);
    } finally {
        redis.quit();
    }
}

checkDiagnostics();
