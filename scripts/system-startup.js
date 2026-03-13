const { execSync, spawn, exec } = require('child_process');
const net = require('net');
const fs = require('fs');
const path = require('path');
const os = require('os');

const npmCmd = os.platform() === 'win32' ? 'npm.cmd' : 'npm';

// Try to load dotenv for environment variables
try {
    require('dotenv').config();
    const envLocal = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envLocal)) {
        require('dotenv').config({ path: envLocal, override: true });
    }
} catch (e) {
    // dotenv might not be available or fails
}

const DEFAULT_REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const REDIS_PORT = parseInt(new URL(DEFAULT_REDIS_URL).port) || 6379;
const REDIS_HOST = new URL(DEFAULT_REDIS_URL).hostname || 'localhost';

async function isPortInUse(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                resolve(true);
            } else {
                resolve(false);
            }
        });
        server.once('listening', () => {
            server.close();
            resolve(false);
        });
        server.listen(port);
    });
}

function checkDockerRunning() {
    return new Promise((resolve) => {
        // Use 'docker version' to check the SERVER engine, which is more reliable than just 'docker ps'
        exec("docker version --format '{{.Server.Version}}'", (error, stdout) => {
            if (error) {
                // Return detailed error categorization if possible
                resolve({ ready: false, error: error.message });
            } else {
                resolve({ ready: true, version: stdout.trim() });
            }
        });
    });
}

function startRedis(isProduction) {
    console.log(`Starting Redis container or local service on port ${REDIS_PORT}...`);
    try {
        // 1. Try Docker first (quietly)
        console.log("Attempting to start Redis via Docker Compose...");
        execSync('docker compose -f infra/docker-compose.yml up -d redis', { stdio: 'pipe' });
        console.log("✅ Redis start command issued via Docker.");
    } catch (e) {
        // 2. Fallback to local binary if available
        const localRedisServer = path.join(process.cwd(), 'Redis', 'redis-server.exe');
        const localRedisConf = path.join(process.cwd(), 'Redis', 'redis.conf');
        
        if (fs.existsSync(localRedisServer)) {
            console.log("⚠️ Docker failed or unavailable. Attempting to start local Redis binary...");
            try {
                // Use spawn so it runs in background
                const redisProcess = spawn(localRedisServer, [localRedisConf], { 
                    cwd: path.dirname(localRedisServer),
                    detached: true,
                    stdio: 'ignore'
                });
                redisProcess.unref();
                console.log("✅ Local Redis process spawned.");
            } catch (localErr) {
                console.error("❌ Failed to start local Redis:", localErr.message);
                if (isProduction) process.exit(1);
            }
        } else {
            if (isProduction) {
                console.error("❌ Failed to start Redis in Production Mode:", e.message);
                process.exit(1);
            } else {
                console.warn("⚠️  Redis could not be started.");
                console.warn("   Troubleshooting: Please ensure Redis is running locally or start Docker Desktop.");
            }
        }
    }
}

function cleanNextCache() {
    console.log("🧹 Cleaning Next.js cache (.next folder)...");
    const nextDir = path.join(process.cwd(), '.next');
    if (fs.existsSync(nextDir)) {
        try {
            const isWin = process.platform === 'win32';
            if (isWin) {
                execSync(`rmdir /s /q "${nextDir}"`, { stdio: 'ignore' });
            } else {
                execSync(`rm -rf "${nextDir}"`, { stdio: 'ignore' });
            }
            console.log("✅ Cache cleaned.");
        } catch (e) {
            console.warn("⚠️  Failed to clean .next folder (it might be in use). Skipping.");
        }
    } else {
        console.log("⏭️ No .next folder found. Skipping clean.");
    }
}

async function main() {
    console.log("=== MultiAgent System Startup Validation ===");

    // 0. Environment Context
    const buildMode = process.env.BUILD_MODE || 'dev';
    const isProduction = buildMode === 'production';

    // 1. Check Docker with Retry (30s)
    if (!isProduction) {
        console.log("⏭️ Skipping Docker engine check (Dev Mode)");
    } else {
        console.log("⏳ Checking Docker engine availability...");
        let dockerInfo = { ready: false };
        for (let i = 0; i < 10; i++) {
            dockerInfo = await checkDockerRunning();
            if (dockerInfo.ready) {
                break;
            }
            if (i === 0) console.log("   Docker CLI or socket not responding yet. Retrying for up to 30s...");
            process.stdout.write(".");
            await new Promise(r => setTimeout(r, 3000));
        }

        if (!dockerInfo.ready) {
            console.error("\n❌ Docker engine is not reachable.");
            console.error("   Diagnostics: " + (dockerInfo.error || "Unknown communication error"));
            console.error("   Troubleshooting: Ensure Docker Desktop is running and 'Expose daemon on tcp://localhost:2375' is enabled (if using legacy pipes).");
            process.exit(1);
        }
        console.log(`\n✅ Docker engine is running (Version: ${dockerInfo.version}).`);
    }

    // 2. Start/Check Redis
    const redisPortInUse = await isPortInUse(REDIS_PORT);
    if (!redisPortInUse) {
        console.log(`Redis is not serving on ${REDIS_PORT}. Attempting to start/restart container...`);
        startRedis(isProduction);
    } else {
        console.log(`✅ Redis is serving on port ${REDIS_PORT}.`);
    }

    // 2.5 Clean Cache
    if (!isProduction) {
        cleanNextCache();
    }

    // 3. Spawning Managed Processes
    const activeProcesses = new Set();
    const systemLog = fs.createWriteStream(path.join(process.cwd(), 'system.log'), { flags: 'a' });

    function startManagedProcess(name, command, args) {
        console.log(`🚀 Starting ${name}...`);
        let child = spawn(command, args, { shell: true });
        
        child.stdout.on('data', (data) => {
            const lines = data.toString().split('\n');
            lines.forEach(line => {
                if (line.trim()) {
                    const entry = `[${name}] ${line.trim()}\n`;
                    systemLog.write(entry);
                    if (line.includes('[DEBUG]') || line.includes('error') || line.includes('failed')) {
                        console.log(entry.trim());
                    }
                }
            });
        });

        child.stderr.on('data', (data) => {
            const lines = data.toString().split('\n');
            lines.forEach(line => {
                if (line.trim()) {
                    const entry = `[${name} ERROR] ${line.trim()}\n`;
                    systemLog.write(entry);
                    console.error(entry.trim());
                }
            });
        });

        activeProcesses.add(child);

        child.on('exit', (code) => {
            activeProcesses.delete(child);
            if (!child.manualKill) {
                console.warn(`⚠️  ${name} exited with code ${code}. Restarting in 2s...`);
                setTimeout(() => startManagedProcess(name, command, args), 2000);
            }
        });

        return child;
    }

    console.log("\n=== Launching Application Stack ===");
    const socketProcess = startManagedProcess('Socket Server', npmCmd, ['run', 'dev:socket']);
    const buildWorkerProcess = startManagedProcess('Build Worker', npmCmd, ['run', 'dev:worker']);
    const watchdogProcess = startManagedProcess('Watchdog', npmCmd, ['run', 'dev:watchdog']);
    
    // Core Agents Pipeline
    const metaWorker = startManagedProcess('Meta Agent', npmCmd, ['run', 'dev:meta']);
    const plannerWorker = startManagedProcess('Planner Agent', npmCmd, ['run', 'dev:planner']);
    const archWorker = startManagedProcess('Architecture Agent', npmCmd, ['run', 'dev:architecture']);
    const genWorker = startManagedProcess('Generator Agent', npmCmd, ['run', 'dev:generator']);
    const valWorker = startManagedProcess('Validator Agent', npmCmd, ['run', 'dev:validator']);
    const repairWorker = startManagedProcess('Repair Agent', npmCmd, ['run', 'dev:repair']);
    const dockerWorker = startManagedProcess('Docker Worker', npmCmd, ['run', 'dev:docker']);

    // Wait briefly for socket API to initialize
    await new Promise(r => setTimeout(r, 2000));

    const webProcess = spawn(npmCmd, ['run', 'dev-safe'], { stdio: 'inherit', shell: true });
    activeProcesses.add(webProcess);

    process.on('SIGINT', () => {
        console.log("\n🛑 Stopping all services...");
        for (const child of activeProcesses) {
            child.manualKill = true;
            child.kill();
        }
        process.exit();
    });

    console.log(`\n⏳ Waiting for Worker heartbeat (Redis ${REDIS_PORT})...`);

    const Redis = require('ioredis');
    const redis = new Redis(DEFAULT_REDIS_URL);
    let workerHealthy = false;

    for (let i = 0; i < 15; i++) {
        try {
            const heartbeat = await redis.get('system:health:worker');
            if (heartbeat) {
                workerHealthy = true;
                break;
            }
        } catch (e) {
            // Redis might still be warming up
        }
        process.stdout.write(".");
        await new Promise(r => setTimeout(r, 1000));
    }
    redis.quit();

    if (!workerHealthy) {
        console.warn("\n⚠️  Worker heartbeat NOT detected. Pipeline may stay stuck in Initializing.");
    } else {
        console.log("\n✅ Worker heartbeat detected!");
    }

    // Final Health Check
    console.log("\n=== Final Health Check ===");
    try {
        const { execSync: execSyncFinal } = require('child_process');
        // Pass REDIS_URL to diagnostic.js override
        execSyncFinal('node scripts/diagnostic.js', {
            stdio: 'inherit',
            env: { ...process.env, REDIS_URL: DEFAULT_REDIS_URL }
        });
        console.log("\n🚀 System is now fully operational.");
        console.log("👉 Press Ctrl+C to stop all services.");
    } catch (e) {
        console.warn("\n⚠️ Diagnostics reported issues. See above for details.");
    }
}

main().catch(console.error);
