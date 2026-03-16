import Redis from 'ioredis';
import { execSync } from 'child_process';

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
            const statusColor = age < 30 ? '✅' : '⚠️';
            console.log(`${statusColor} Worker: Active (Last seen ${age}s ago)`);
            console.log(`   Worker ID: ${health.workerId}`);
            console.log(`   Memory: ${health.memory?.toFixed(2) || 'N/A'} MB`);
        } else {
            console.log("❌ Worker: OFFLINE (No heartbeat found in Redis)");
        }

        // 2. Check Job Counts
        const queues = [
            'project-generation-free-v1',
            'project-generation-pro-v1',
            'build-init',
            'preview-schedule-v1'
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
                ? 'tasklist /FI "IMAGENAME eq node.exe" /NH'
                : 'pgrep node';
            
            const processes = execSync(cmd, { encoding: 'utf8' });
            const lines = processes.trim().split('\n').filter(line => line.trim().length > 0);
            
            let nodeCount = 0;
            if (isWin) {
                nodeCount = lines.filter(line => line.toLowerCase().includes('node.exe')).length;
            } else {
                nodeCount = lines.length;
            }
            
            console.log(`Found ${nodeCount} Node.js processes running.`);
        } catch {
            console.error("Diagnostic error occurred while checking processes.");
        }

    } catch (e) {
        console.error("❌ Redis: Connection Failed", e.message);
    } finally {
        redis.quit();
    }
}

checkDiagnostics();
