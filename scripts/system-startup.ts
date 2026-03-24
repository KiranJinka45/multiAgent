import { spawn } from 'child_process';
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
const REDIS_PORT = parseInt(new URL(DEFAULT_REDIS_URL).port || '6379');

/**
 * ManagedProcess
 * Tracks restart attempts and prevents infinite crash loops.
 */
class ManagedProcess {
    private restartCount = 0;
    private maxRestarts = 5;
    private lastRestartAt = 0;
    private cooldownMs = 5000;
    private child: import('child_process').ChildProcess | null = null;
    public manualKill = false;

    constructor(
        private name: string,
        private command: string,
        private args: string[],
        private logStream: fs.WriteStream
    ) {}

    start() {
        if (this.manualKill) return;

        console.log(`🚀 Starting ${this.name}...`);
        this.child = spawn(this.command, this.args, { shell: true });

        this.child.stdout?.on('data', (data) => {
            this.logStream.write(`[${this.name}] ${data.toString().trim()}\n`);
        });

        this.child.stderr?.on('data', (data) => {
            const entry = `[${this.name} ERROR] ${data.toString().trim()}\n`;
            this.logStream.write(entry);
            console.error(entry.trim());
        });

        this.child.on('exit', (code) => {
            if (this.manualKill) return;

            const now = Date.now();
            // Reset count if it's been running fine for more than 30s
            if (now - this.lastRestartAt > 30000) {
                this.restartCount = 0;
            }

            this.restartCount++;
            this.lastRestartAt = now;

            if (this.restartCount > this.maxRestarts) {
                console.error(`❌ FATAL: ${this.name} crashed too many times (${this.restartCount}). Giving up.`);
                process.emit('SIGINT'); // Trigger system shutdown
                return;
            }

            console.warn(`⚠️  ${this.name} exited (code ${code}). Restarting in ${this.cooldownMs / 1000}s... (Attempt ${this.restartCount}/${this.maxRestarts})`);
            setTimeout(() => this.start(), this.cooldownMs);
        });
    }

    stop() {
        this.manualKill = true;
        this.child?.kill();
    }
}

async function isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', () => resolve(false));
        server.once('listening', () => {
            server.close();
            resolve(true);
        });
        server.listen(port);
    });
}

async function checkRedisHealth(url: string): Promise<boolean> {
    try {
        const Redis = (await import('ioredis')).default;
        const redis = new Redis(url, { connectTimeout: 2000, retryStrategy: () => null });
        const ping = await redis.ping();
        await redis.quit();
        return ping === 'PONG';
    } catch {
        return false;
    }
}

async function waitForSocketHealth(url: string, timeoutMs = 30000): Promise<boolean> {
    console.log(`⏳ Waiting for Socket Server health at ${url}...`);
    const startTime = Date.now();
    const http = await import('http');
    
    while (Date.now() - startTime < timeoutMs) {
        try {
            const ok = await new Promise<boolean>((resolve) => {
                const req = http.get(url, (res) => {
                    resolve(res.statusCode === 200);
                });
                req.on('error', () => resolve(false));
                req.end();
            });
            if (ok) {
                console.log("\n✅ Socket Server is healthy!");
                return true;
            }
        } catch { /* ignore */ }
        process.stdout.write(".");
        await new Promise(r => setTimeout(r, 1000));
    }
    return false;
}

function startRedis() {
    console.log(`Starting Redis on port ${REDIS_PORT}...`);
    const localRedisServer = path.join(process.cwd(), 'Redis', 'redis-server.exe');
    if (fs.existsSync(localRedisServer)) {
        try {
            const redisProcess = spawn(localRedisServer, [], { 
                cwd: path.dirname(localRedisServer),
                detached: true,
                stdio: 'ignore'
            });
            redisProcess.unref();
            console.log("✅ Redis process spawned.");
        } catch (e) {
            console.error("❌ Failed to start Redis:", (e as Error).message);
        }
    } else {
        console.warn("⚠️  Redis binary not found locally. Ensure it's running.");
    }
}

async function startup() {
    console.log("\n=== MultiAgent Production-Ready Startup ===");

    // 1. Pre-flight Checks
    const criticalPorts = [3001, 3011];
    for (const port of criticalPorts) {
        if (!(await isPortAvailable(port))) {
            console.error(`❌ Port ${port} is already in use. Local services may conflict.`);
            process.exit(1);
        }
    }
    console.log("✅ Ports are available.");

    // 2. Redis Setup
    let redisHealthy = await checkRedisHealth(DEFAULT_REDIS_URL);
    if (!redisHealthy) {
        startRedis();
        // Wait for Redis to warm up
        for (let i = 0; i < 5; i++) {
            await new Promise(r => setTimeout(r, 1000));
            if (await checkRedisHealth(DEFAULT_REDIS_URL)) {
                redisHealthy = true;
                break;
            }
        }
    }

    if (!redisHealthy) {
        console.error("❌ Redis is not reachable. Failing fast.");
        process.exit(1);
    }
    console.log("✅ Redis is healthy.");

    // 3. Process Management
    const logPath = path.join(process.cwd(), 'system.log');
    const systemLog = fs.createWriteStream(logPath, { flags: 'a' });
    const managedProcesses: ManagedProcess[] = [];

    const webProcess = spawn(npmCmd, ['--prefix', 'apps/frontend', 'run', 'dev'], { stdio: 'inherit', shell: true });

    const apiProcess = new ManagedProcess('Socket Server', npmCmd, ['--prefix', 'apps/api-gateway', 'run', 'start:socket'], systemLog);
    const watchdogProcess = new ManagedProcess('Watchdog', npmCmd, ['--prefix', 'apps/api-gateway', 'run', 'start:watchdog'], systemLog);
    const deployProcess = new ManagedProcess('Deploy Service', npmCmd, ['run', 'start:deploy'], systemLog);
    
    managedProcesses.push(apiProcess, watchdogProcess, deployProcess);

    const workerPoolSize = parseInt(process.env.WORKER_POOL_SIZE || '2');
    for (let i = 0; i < workerPoolSize; i++) {
        managedProcesses.push(new ManagedProcess(`Worker #${i+1}`, npmCmd, ['--prefix', 'apps/api-gateway', 'run', 'start:worker'], systemLog));
    }

    managedProcesses.forEach(p => p.start());

    // 4. Health Verification
    const socketHealthy = await waitForSocketHealth('http://localhost:3011/health');
    if (!socketHealthy) {
        console.error("\n❌ Socket Server failed to become healthy. Check system.log");
    }

    console.log(`\n⏳ Waiting for Worker heartbeat (Redis ${REDIS_PORT})...`);
    let workerHealthy = false;
    try {
        const Redis = (await import('ioredis')).default;
        const redis = new Redis(DEFAULT_REDIS_URL);
        
        for (let i = 0; i < 20; i++) {
            const heartbeat = await redis.get('system:health:worker');
            if (heartbeat) {
                const health = JSON.parse(heartbeat);
                if (Date.now() - health.lastSeen < 60000) {
                    workerHealthy = true;
                    break;
                }
            }
            process.stdout.write(".");
            await new Promise(r => setTimeout(r, 2000));
        }
        await redis.quit();
    } catch (e) {
        console.warn("\n⚠️  Failed to check worker health:", (e as Error).message);
    }

    if (workerHealthy) {
        console.log("\n✅ Worker pool is active and reporting health.");
    } else {
        console.warn("\n⚠️  Worker heartbeat timeout. Workers might be struggling or still starting.");
    }

    // 5. Cleanup Logic
    process.on('SIGINT', () => {
        console.log("\n🛑 Shutting down MultiAgent...");
        managedProcesses.forEach(p => p.stop());
        webProcess.kill();
        systemLog.end();
        process.exit(0);
    });

    console.log("\n🚀 System is operational. Press Ctrl+C to exit.");
}

startup().catch(err => {
    console.error("FATAL ERROR during startup:", err);
    process.exit(1);
});
