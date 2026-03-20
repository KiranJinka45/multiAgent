import { execSync, spawn, exec } from 'child_process';
import net from 'net';
import fs from 'fs';
import path from 'path';
import os from 'os';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();
const envLocal = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocal)) {
    dotenv.config({ path: envLocal, override: true });
}

const npmCmd = os.platform() === 'win32' ? 'npm.cmd' : 'npm';
const DEFAULT_REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const REDIS_PORT = 6379;

async function isPortInUse(port: number): Promise<boolean> {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', (err: NodeJS.ErrnoException) => {
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

async function waitForSocketHealth(url: string, timeoutMs = 30000): Promise<boolean> {
    console.log(`⏳ Waiting for Socket Server health at ${url}...`);
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
        try {
            const http = await import('http');
            const ok = await new Promise<boolean>((resolve) => {
                const req = http.get(url, (res) => {
                    resolve(res.statusCode === 200);
                });
                req.on('error', () => resolve(false));
                req.end();
            });
            if (ok) {
                console.log("✅ Socket Server is healthy!");
                return true;
            }
        } catch {
            // ignore
        }
        process.stdout.write(".");
        await new Promise(r => setTimeout(r, 1000));
    }
    console.warn("\n⚠️ Socket Server health check timed out. Proceeding anyway...");
    return false;
}

function checkDockerRunning(): Promise<{ ready: boolean, version?: string, error?: string }> {
    return new Promise((resolve) => {
        exec("docker version --format '{{.Server.Version}}'", (error, stdout) => {
            if (error) {
                resolve({ ready: false, error: error.message });
            } else {
                resolve({ ready: true, version: stdout.trim() });
            }
        });
    });
}

function startRedis(isProduction: boolean) {
    console.log(`Starting Redis container or local service on port ${REDIS_PORT}...`);
    try {
        console.log("Attempting to start Redis via Docker Compose...");
        execSync('docker compose -f infra/docker-compose.yml up -d redis', { stdio: 'pipe' });
        console.log("✅ Redis start command issued via Docker.");
    } catch (e) {
        // Docker might not be available, fallback to local Redis
        const localRedisServer = path.join(process.cwd(), 'Redis', 'redis-server.exe');
        const localRedisConf = path.join(process.cwd(), 'Redis', 'redis.conf');
        
        if (fs.existsSync(localRedisServer)) {
            console.log("⚠️ Docker failed or unavailable. Attempting to start local Redis binary...");
            try {
                const redisProcess = spawn(localRedisServer, [localRedisConf], { 
                    cwd: path.dirname(localRedisServer),
                    detached: true,
                    stdio: 'ignore'
                });
                redisProcess.unref();
                console.log("✅ Local Redis process spawned.");
            } catch (localErr) {
                const lErr = localErr as Error;
                console.error("❌ Failed to start local Redis:", lErr.message);
                if (isProduction) process.exit(1);
            }
        } else {
            if (isProduction) {
                console.error("❌ Failed to start Redis in Production Mode:", e.message);
                process.exit(1);
            } else {
                console.warn("⚠️  Redis could not be started.");
            }
        }
    }
}

function cleanNextCache() {
    console.log("🧹 Cleaning Next.js cache (.next folder)...");
    const nextDir = path.join(process.cwd(), '.next');
    if (fs.existsSync(nextDir)) {
        try {
            if (process.platform === 'win32') {
                execSync(`rmdir /s /q "${nextDir}"`, { stdio: 'ignore' });
            } else {
                execSync(`rm -rf "${nextDir}"`, { stdio: 'ignore' });
            }
            console.log("✅ Cache cleaned.");
        } catch {
            console.warn("⚠️  Failed to clean .next folder (it might be in use). Skipping.");
        }
    } else {
        console.log("⏭️ No .next folder found. Skipping clean.");
    }
}

async function startup() {
    console.log("=== MultiAgent System Startup Validation ===");

    const buildMode = process.env.BUILD_MODE || 'dev';
    const isProduction = buildMode === 'production';

    if (!isProduction) {
        console.log("⏭️ Skipping Docker engine check (Dev Mode)");
    } else {
        console.log("⏳ Checking Docker engine availability...");
        let dockerInfo: { ready: boolean, version?: string, error?: string } = { ready: false };
        for (let i = 0; i < 10; i++) {
            dockerInfo = await checkDockerRunning();
            if (dockerInfo.ready) break;
            if (i === 0) console.log("   Docker CLI or socket not responding yet. Retrying for up to 30s...");
            process.stdout.write(".");
            await new Promise(r => setTimeout(r, 3000));
        }

        if (!dockerInfo.ready) {
            console.error("\n❌ Docker engine is not reachable.");
            console.error("   Diagnostics: " + (dockerInfo.error || "Unknown communication error"));
            process.exit(1);
        }
        console.log(`\n✅ Docker engine is running (Version: ${dockerInfo.version}).`);
    }

    const redisPortInUse = await isPortInUse(REDIS_PORT);
    if (!redisPortInUse) {
        startRedis(isProduction);
    } else {
        console.log(`✅ Redis is serving on port ${REDIS_PORT}.`);
    }

    if (!isProduction) {
        cleanNextCache();
    }

    const activeProcesses = new Set<import('child_process').ChildProcess>();
    const systemLog = fs.createWriteStream(path.join(process.cwd(), 'system.log'), { flags: 'a' });

    function startManagedProcess(name: string, command: string, args: string[]) {
        console.log(`🚀 Starting ${name} in ${process.cwd()}...`);
        console.log(`   Command: ${command} ${args.join(' ')}`);
        const child = spawn(command, args, { shell: true });
        
        child.stdout.on('data', (data: Buffer) => {
            const entry = `[${name}] ${data.toString().trim()}\n`;
            systemLog.write(entry);
        });

        child.stderr.on('data', (data: Buffer) => {
            const entry = `[${name} ERROR] ${data.toString().trim()}\n`;
            systemLog.write(entry);
            console.error(entry.trim());
        });

        activeProcesses.add(child);

        child.on('exit', (code: number | null) => {
            activeProcesses.delete(child);
            if (!(child as any).manualKill) {
                console.warn(`⚠️  ${name} exited with code ${code}. Restarting in 5s...`);
                setTimeout(() => startManagedProcess(name, command, args), 5000);
            }
        });

        return child;
    }

    console.log("\n=== Launching Application Stack ===");
    startManagedProcess('Socket Server (3011)', npmCmd, ['run', 'dev:socket']);
    startManagedProcess('Watchdog', npmCmd, ['run', 'dev:watchdog']);
    
    console.log("🔥 Pre-warming Worker Pool...");
    const workerPoolSize = parseInt(process.env.WORKER_POOL_SIZE || '3');
    for (let i = 0; i < workerPoolSize; i++) {
        startManagedProcess(`Build Worker #${i+1}`, npmCmd, ['run', 'dev:worker']);
    }
    
    await waitForSocketHealth('http://localhost:3011/health');

    const webProcess = spawn(npmCmd, ['run', 'dev-safe', '--', 'apps/web', '-p', '3004'], { stdio: 'inherit', shell: true });
    activeProcesses.add(webProcess);

    process.on('SIGINT', () => {
        console.log("\n🛑 Stopping all services...");
        for (const child of activeProcesses) {
            (child as any).manualKill = true;
            child.kill();
        }
        process.exit();
    });

    console.log(`\n⏳ Waiting for Worker heartbeat (Redis ${REDIS_PORT})...`);

    const Redis = (await import('ioredis')).default;
    const redis = new Redis(DEFAULT_REDIS_URL);
    let workerHealthy = false;

    for (let i = 0; i < 15; i++) {
        try {
            const heartbeat = await redis.get('system:health:worker');
            if (heartbeat) {
                workerHealthy = true;
                break;
            }
        } catch {
            // ignore
        }
        process.stdout.write(".");
        await new Promise(r => setTimeout(r, 1000));
    }
    redis.quit();

    if (!workerHealthy) {
        console.warn("\n⚠️  Worker heartbeat NOT detected. Pipeline may stay stuck.");
    } else {
        console.log("\n✅ Worker heartbeat detected!");
    }

    console.log("\n=== Final Health Check ===");
    try {
        execSync('node scripts/diagnostic.js', {
            stdio: 'inherit',
            env: { ...process.env, REDIS_URL: DEFAULT_REDIS_URL }
        });
        console.log("\n🚀 System is now fully operational.");
        console.log("👉 Press Ctrl+C to stop all services.");
    } catch {
        console.warn("⚠️  Final diagnostic check failed.");
    }
}

startup().catch((err: Error) => {
    console.error("FATAL: System startup failed.", err);
    process.exit(1);
});
