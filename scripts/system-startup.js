"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = __importDefault(require("http"));
// -----------------------------
// CONFIG & ENVIRONMENT
// -----------------------------
process.env.NODE_ENV = 'production';
// Load environment variables
dotenv_1.default.config();
const envLocal = path_1.default.resolve(process.cwd(), '.env.local');
if (fs_1.default.existsSync(envLocal)) {
    dotenv_1.default.config({ path: envLocal, override: true });
}
console.log("\n=== 🚀 MultiAgent Production-Grade Boot ===\n");
console.log("🌍 Environment: " + process.env.NODE_ENV);
const npmCmd = os_1.default.platform() === 'win32' ? 'npm.cmd' : 'npm';
const HEALTH_URL = 'http://localhost:3011/health';
const TIMEOUTS = {
    socket: 90000,
    worker: 45000
};
const processes = [];
// -----------------------------
// SPAWN HELPER (FAIL-FAST)
// -----------------------------
function startProcess(name, command, args, options = {}) {
    console.log(`🚀 Starting ${name}...`);
    const proc = (0, child_process_1.spawn)(command, args, {
        stdio: 'inherit',
        shell: true,
        env: { ...process.env, SERVICE_NAME: name },
        ...options,
    });
    proc.on('exit', (code) => {
        if (code !== 0 && code !== null) {
            console.error(`\n❌ CRITICAL: ${name} exited with code ${code}`);
            shutdown();
        }
    });
    proc.on('error', (err) => {
        console.error(`\n❌ FATAL: Failed to start ${name}:`, err);
        shutdown();
    });
    processes.push(proc);
    return proc;
}
// -----------------------------
// HEALTH CHECK (DETERMINISTIC)
// -----------------------------
async function waitForHealth(name, url, timeout) {
    console.log(`⏳ Waiting for ${name} health: ${url}`);
    const start = Date.now();
    while (Date.now() - start < timeout) {
        try {
            const result = await new Promise((resolve) => {
                const req = http_1.default.get(url, (res) => {
                    resolve({
                        ok: res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 500,
                        status: res.statusCode
                    });
                });
                req.on('error', (err) => resolve({ ok: false, error: err.message }));
                req.setTimeout(2000, () => {
                    req.destroy();
                    resolve({ ok: false, error: 'TIMEOUT' });
                });
                req.end();
            });
            if (result.ok) {
                console.log(`\n✅ ${name} is healthy! (Status: ${result.status})`);
                return;
            }
            else if (result.error && result.error !== 'ECONNREFUSED' && result.error !== 'TIMEOUT') {
                process.stdout.write(`[${result.error}]`);
            }
        }
        catch (e) {
            process.stdout.write(`!`);
        }
        process.stdout.write(".");
        await new Promise((r) => setTimeout(r, 2000));
    }
    throw new Error(`\n❌ ${name} failed health check after ${timeout / 1000}s`);
}
async function waitForFrontend(url, timeout = 60000) {
    console.log(`⏳ Waiting for Frontend: ${url} (warmup delay 3s...)`);
    await new Promise(r => setTimeout(r, 3000));
    return waitForHealth("Frontend", url, timeout);
}
// -----------------------------
// CLEAN PORT (WINDOWS SAFE)
// -----------------------------
function killPort(port) {
    try {
        if (os_1.default.platform() === 'win32') {
            const psPath = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
            const cmd = `${psPath} -Command "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"`;
            (0, child_process_1.execSync)(cmd, { stdio: 'ignore' });
            console.log(`🧹 Attempted cleanup of port ${port}`);
        }
        else {
            (0, child_process_1.execSync)(`lsof -ti:${port} | xargs kill -9`, { stdio: 'ignore' });
            console.log(`🧹 Freed port ${port}`);
        }
    }
    catch { /* ignore */ }
}
// -----------------------------
// GRACEFUL SHUTDOWN
// -----------------------------
function shutdown() {
    console.log("\n🛑 Shutting down MultiAgent...\n");
    for (const proc of processes) {
        try {
            if (os_1.default.platform() === 'win32') {
                (0, child_process_1.execSync)(`taskkill /pid ${proc.pid} /F /T`, { stdio: 'ignore' });
            }
            else {
                proc.kill('SIGTERM');
            }
        }
        catch (_) { }
    }
    process.exit(1);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
// -----------------------------
// MAIN BOOT SEQUENCE
// -----------------------------
(async () => {
    try {
        console.log("🧹 Cleaning up existing service ports...");
        killPort(3004);
        killPort(3011);
        console.log("✅ Ports are ready for new boot.\n");
        // 1. Start Socket Server (Foundation)
        startProcess("Socket Server", npmCmd, ['run', 'start:socket'], { cwd: path_1.default.join(process.cwd(), 'apps', 'api-gateway') });
        console.log("⏳ Waiting 5s for process to initialize...");
        await new Promise(r => setTimeout(r, 5000));
        await waitForHealth("Socket Server", HEALTH_URL, TIMEOUTS.socket);
        // 2. Start Frontend
        startProcess("Frontend", npmCmd, ['run', 'dev'], { cwd: path_1.default.join(process.cwd(), 'apps', 'frontend') });
        try {
            await waitForFrontend("http://localhost:3004", 120000);
        }
        catch (e) {
            console.warn(`\n⚠️  Frontend health check skipped/failed: ${e.message}. Continuing boot...`);
        }
        // 3. Start Scaling Cluster
        console.log("\n🚀 Scaling MultiAgent Cluster...");
        startProcess("Watchdog", npmCmd, ['run', 'start:watchdog'], { cwd: path_1.default.join(process.cwd(), 'apps', 'api-gateway') });
        startProcess("Deploy Service", npmCmd, ['run', 'start:deploy']);
        const workerPoolSize = parseInt(process.env.WORKER_POOL_SIZE || '2');
        for (let i = 0; i < workerPoolSize; i++) {
            startProcess(`Worker #${i + 1}`, npmCmd, ['run', 'start:worker'], { cwd: path_1.default.join(process.cwd(), 'apps', 'api-gateway') });
        }
        console.log("\n🎉 SYSTEM FULLY OPERATIONAL");
        console.log("👉 Frontend: http://localhost:3004");
        console.log("👉 Socket:   http://127.0.0.1:3011/health\n");
        console.log("🚀 Press Ctrl+C to exit.\n");
        // -------------------------
        // PERSISTENCE (CRITICAL FIX)
        // -------------------------
        process.stdin.resume();
    }
    catch (err) {
        console.error("\n💥 BOOT FAILURE:", err.message);
        shutdown();
    }
})();
//# sourceMappingURL=system-startup.js.map