import 'dotenv/config';
import { spawn, ChildProcess, execSync } from 'child_process';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const lockfilePath = path.join(process.cwd(), '.ztan-orchestrator-pids.json');

async function wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getPidUsingPort(port: number): number | null {
    try {
        if (process.platform === 'win32') {
            const output = execSync(`netstat -ano`, { stdio: ['pipe', 'pipe', 'ignore'] }).toString();
            const lines = output.split('\n');
            const regex = new RegExp(`[:\\s]${port}\\s+[^\\s]+\\s+LISTENING\\s+(\\d+)`, 'i');
            for (const line of lines) {
                const match = line.match(regex);
                if (match) {
                    const pid = parseInt(match[1], 10);
                    if (!isNaN(pid) && pid > 0) {
                        return pid;
                    }
                }
            }
        } else {
            const output = execSync(`lsof -t -i:${port}`, { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim();
            const pid = parseInt(output, 10);
            if (!isNaN(pid) && pid > 0) {
                return pid;
            }
        }
    } catch (e) {
        // Suppress
    }
    return null;
}

function getProcessAncestryInfo(pid: number, depth = 0): string {
    if (depth > 4) return '';
    try {
        let info = '';
        let parentPid: number | null = null;
        
        if (process.platform === 'win32') {
            const queryCmd = `powershell -Command "Get-CimInstance Win32_Process -Filter 'ProcessId = ${pid}' | Select-Object -Property ParentProcessId, ExecutablePath, CommandLine | Format-List"`;
            const output = execSync(queryCmd, { stdio: ['pipe', 'pipe', 'ignore'] }).toString();
            info += output;
            
            const match = output.match(/ParentProcessId\s*:\s*(\d+)/i);
            if (match) {
                parentPid = parseInt(match[1], 10);
            }
        } else {
            const output = execSync(`ps -o ppid=,command= -p ${pid}`, { stdio: ['pipe', 'pipe', 'ignore'] }).toString();
            info += output;
            const parts = output.trim().split(/\s+/);
            if (parts.length > 0) {
                const ppid = parseInt(parts[0], 10);
                if (!isNaN(ppid) && ppid > 0) {
                    parentPid = ppid;
                }
            }
        }
        
        if (parentPid && parentPid > 0 && parentPid !== pid) {
            info += '\n' + getProcessAncestryInfo(parentPid, depth + 1);
        }
        return info;
    } catch (e) {
        return '';
    }
}

function verifyProcessOwnership(pid: number): boolean {
    try {
        const cwdNormalized = process.cwd().toLowerCase().replace(/\\/g, '/');
        const folderName = path.basename(process.cwd()).toLowerCase();
        
        let output = getProcessAncestryInfo(pid);
        if (process.platform !== 'win32') {
            try {
                const targetCwd = fs.readlinkSync(`/proc/${pid}/cwd`);
                output += ' ' + targetCwd;
            } catch (e) {}
        }

        const outputLower = output.toLowerCase().replace(/\\/g, '/');

        // Check if output contains workspace cwd or folder name
        const isCwdPresent = outputLower.includes(cwdNormalized);
        const isFolderNamePresent = outputLower.includes(folderName);
        
        if (isCwdPresent || isFolderNamePresent) {
            return true;
        }

        // Safe fallback signatures: check if it's node/pnpm/tsx/ng running our apps/packages
        const isNodeOrPnpm = outputLower.includes('node') || outputLower.includes('pnpm') || outputLower.includes('tsx') || outputLower.includes('ng');
        const hasServiceKeywords = outputLower.includes('core-api') || outputLower.includes('auth-service') || outputLower.includes('worker') || outputLower.includes('gateway') || outputLower.includes('stewardship-console');
        
        if (isNodeOrPnpm && hasServiceKeywords) {
            return true;
        }

        return false;
    } catch (e) {
        return false;
    }
}

function killProcess(pid: number, name: string): boolean {
    try {
        // Enforce ownership validation to protect non-workspace PIDs
        if (!verifyProcessOwnership(pid)) {
            console.error(`❌ [Orchestrator] Process ${name} (PID: ${pid}) occupying port is not owned by this workspace signature. Refusing to terminate.`);
            return false;
        }

        console.log(`⚠️  [Orchestrator] Terminating process ${name} (PID: ${pid})...`);
        if (process.platform === 'win32') {
            execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
        } else {
            process.kill(pid, 'SIGKILL');
        }
        return true;
    } catch (e) {
        try {
            process.kill(pid, 0);
            console.error(`❌ [Orchestrator] Failed to terminate process ${pid}`);
            return false;
        } catch {
            return true;
        }
    }
}

function writePidLockfile(pids: { name: string; pid: number }[]) {
    try {
        fs.writeFileSync(lockfilePath, JSON.stringify(pids, null, 2));
    } catch (e) {
        console.error('Failed to write PID lockfile:', e);
    }
}

function readPidLockfile(): { name: string; pid: number }[] {
    try {
        if (fs.existsSync(lockfilePath)) {
            return JSON.parse(fs.readFileSync(lockfilePath, 'utf8'));
        }
    } catch (e) {
        // ignore
    }
    return [];
}

function cleanupStaleProcesses() {
    console.log('🔍 [Preflight] Checking for stale processes and port collisions...');
    
    // 1. Clean up processes from the PID lockfile
    const lockfilePids = readPidLockfile();
    for (const item of lockfilePids) {
        try {
            process.kill(item.pid, 0);
            console.log(`⚠️  [Preflight] Found running stale orchestrator child: ${item.name} (PID: ${item.pid}). Killing...`);
            killProcess(item.pid, item.name);
        } catch (e) {
            // Already dead
        }
    }
    
    // 2. Clean up port collisions on known service ports
    const services = [
        { name: 'Core API', port: 3010 },
        { name: 'Auth Service', port: 4005 },
        { name: 'Worker', port: 8082 },
        { name: 'Gateway', port: 3500 },
        { name: 'Frontend', port: 4200 }
    ];
    
    for (const service of services) {
        const pid = getPidUsingPort(service.port);
        if (pid) {
            console.log(`⚠️  [Preflight] Port collision detected on port ${service.port} for ${service.name}. Owned by PID: ${pid}. Killing...`);
            const success = killProcess(pid, `${service.name} (port ${service.port})`);
            if (!success) {
                console.error(`❌ [Preflight] Refused to terminate process on port ${service.port} as it is not owned by this workspace. Please free the port manually.`);
                process.exit(1);
            }
            
            // Wait 1 second for OS to release the port
            execSync('node -e "setTimeout(() => {}, 1000)"');
            
            const doubleCheckPid = getPidUsingPort(service.port);
            if (doubleCheckPid) {
                console.error(`❌ [Preflight] Failed to free port ${service.port}. Another process is still holding it.`);
                process.exit(1);
            }
        }
    }
    
    if (fs.existsSync(lockfilePath)) {
        try {
            fs.unlinkSync(lockfilePath);
        } catch (e) {}
    }
    console.log('✅ [Preflight] Preflight checks passed. Environment is clean.');
}

async function verifyStabilizedHealth(url: string, serviceName: string, retries = 30): Promise<boolean> {
    let consecutiveSuccesses = 0;
    const requiredConsecutive = 2; // 2 successful checks spaced by 2s = ~4 seconds of stabilization
    
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios.get(url, { timeout: 2000 });
            if (response.status === 200) {
                consecutiveSuccesses++;
                console.log(`  [Health check] ${serviceName} check ${consecutiveSuccesses}/${requiredConsecutive} succeeded.`);
                if (consecutiveSuccesses >= requiredConsecutive) {
                    console.log(`  ✅ [Stabilization] ${serviceName} is stable and ready at ${url}`);
                    return true;
                }
            } else {
                consecutiveSuccesses = 0;
            }
        } catch (e) {
            consecutiveSuccesses = 0;
        }
        await wait(2000);
    }
    return false;
}

interface ServiceProcess {
    name: string;
    command: string;
    args: string[];
    cwd: string;
    proc: ChildProcess;
    restartCount: number;
    lastRestartTime: number;
    backoffDelay: number;
    nextAllowedRestartTime: number;
}

const processes: ServiceProcess[] = [];
let isShuttingDown = false;

async function startService(command: string, args: string[], cwd: string, serviceName: string): Promise<ChildProcess> {
    const servicePorts: Record<string, number> = {
        'Core API': 3010,
        'Auth Service': 4005,
        'Worker': 8082,
        'Gateway': 3500,
        'Frontend': 4200
    };
    const port = servicePorts[serviceName];
    if (port) {
        const pid = getPidUsingPort(port);
        if (pid) {
            console.log(`⚠️  [Orchestrator] Port collision detected on port ${port} for ${serviceName} during start/restart. Owned by PID: ${pid}. Reclaiming...`);
            const success = killProcess(pid, `${serviceName} (port ${port})`);
            if (!success) {
                console.error(`❌ [Orchestrator] Refused to terminate process on port ${port} as it is not owned by this workspace.`);
            } else {
                await wait(1000);
            }
        }
    }

    console.log(`🚀 Starting ${serviceName}...`);
    const proc = spawn(command, args, {
        cwd,
        shell: true,
        stdio: 'inherit',
        env: { ...process.env, NO_CLUSTER: 'true' }
    });

    const idx = processes.findIndex(p => p.name === serviceName);
    const existing = idx !== -1 ? processes[idx] : null;

    const serviceObj: ServiceProcess = {
        name: serviceName,
        command,
        args,
        cwd,
        proc,
        restartCount: existing ? existing.restartCount : 0,
        lastRestartTime: Date.now(),
        backoffDelay: existing ? existing.backoffDelay : 5000,
        nextAllowedRestartTime: existing ? existing.nextAllowedRestartTime : 0
    };
    
    if (idx !== -1) {
        processes[idx] = serviceObj;
    } else {
        processes.push(serviceObj);
    }
    
    const activePids = processes
        .filter(p => p.proc.pid !== undefined && !p.proc.killed)
        .map(p => ({ name: p.name, pid: p.proc.pid! }));
    writePidLockfile(activePids);

    proc.on('exit', (code) => {
        if (code !== 0 && code !== null && !isShuttingDown) {
            console.error(`❌ [Orchestrator] ${serviceName} exited with code ${code}`);
        }
    });

    return proc;
}

function startReconciliationLoop() {
    const serviceDependencies: Record<string, string[]> = {
        'Auth Service': ['Core API'],
        'Gateway': ['Core API'],
        'Worker': ['Auth Service'],
        'Frontend': ['Gateway']
    };

    setInterval(() => {
        if (isShuttingDown) return;
        
        for (const p of processes) {
            let isRunning = false;
            try {
                if (p.proc.pid !== undefined) {
                    process.kill(p.proc.pid, 0);
                    isRunning = true;
                }
            } catch (e) {
                // Process not running
            }
            
            if (isRunning) {
                // If service is running and has stabilized for 60s, reset its backoff/budget
                if (p.restartCount > 0 && (Date.now() - p.lastRestartTime >= 60000)) {
                    console.log(`✅ [Orchestrator] Service ${p.name} has stabilized for 60s. Resetting restart budget.`);
                    p.restartCount = 0;
                    p.backoffDelay = 5000;
                }
            } else if (!p.proc.killed) {
                // Process is dead and not cleanly stopped
                const now = Date.now();
                if (now < p.nextAllowedRestartTime) {
                    // Still in backoff cooling period
                    continue;
                }

                // Check dependencies before attempting restart (Dependency-Aware Suppression)
                const deps = serviceDependencies[p.name] || [];
                let allDepsHealthy = true;
                let missingDep = '';
                for (const depName of deps) {
                    const depProc = processes.find(proc => proc.name === depName);
                    let depRunning = false;
                    if (depProc && depProc.proc.pid !== undefined) {
                        try {
                            process.kill(depProc.proc.pid, 0);
                            depRunning = true;
                        } catch (e) {}
                    }
                    if (!depRunning) {
                        allDepsHealthy = false;
                        missingDep = depName;
                        break;
                    }
                }

                if (!allDepsHealthy) {
                    console.warn(`⏳ [Orchestrator] Suppression: Delaying restart of ${p.name} because its dependency ${missingDep} is currently down.`);
                    continue;
                }
                
                if (p.restartCount >= 5) {
                    console.error(`❌ [Orchestrator] Service ${p.name} exceeded its restart budget (5 crashes). Fatal crash loop detected. Aborting stack...`);
                    cleanup();
                    process.exit(1);
                }
                
                p.restartCount++;
                // Add randomized jitter (80% - 120%) to avoid synchronized restart stampedes
                const jitter = 0.8 + Math.random() * 0.4;
                const delayMs = Math.round(p.backoffDelay * jitter);
                p.nextAllowedRestartTime = now + delayMs;
                // Double the backoff delay up to a max of 60s
                p.backoffDelay = Math.min(p.backoffDelay * 2, 60000);
                
                console.warn(`⚠️  [Orchestrator] Drift detected: ${p.name} is down. Reconciling in ${(delayMs / 1000).toFixed(1)}s (Attempt ${p.restartCount}/5)...`);
                
                setTimeout(() => {
                    if (isShuttingDown) return;
                    startService(p.command, p.args, p.cwd, p.name).catch(err => {
                        console.error(`Failed to restart service ${p.name}:`, err);
                    });
                }, delayMs);
            }
        }
        
        const activePids = processes
            .filter(p => p.proc.pid !== undefined)
            .map(p => ({ name: p.name, pid: p.proc.pid! }));
        writePidLockfile(activePids);
    }, 5000);
}

async function main() {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║        ZTAN DETERMINISTIC STARTUP ORCHESTRATOR           ║');
    console.log('║       - Health-Dependent Service Dependency Graph -       ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    console.log('Graph of Dependencies:\n');
    console.log('  [Redis / Postgres] (External/Docker)');
    console.log('          │');
    console.log('          ▼');
    console.log('     [Core API] (Port 3010)');
    console.log('        /   \\');
    console.log('       ▼     ▼');
    console.log('  [Auth API] [Gateway] (Port 3500)');
    console.log('   (Port 4005)  │');
    console.log('       │        ▼');
    console.log('       │   [Frontend] (Port 4200)');
    console.log('       ▼');
    console.log('    [Worker] (Heartbeat)\n');

    // Preflight check
    cleanupStaleProcesses();

    // 1. Core API (3010)
    await startService('pnpm', ['--filter', '@apps/core-api', 'run', 'start'], '.', 'Core API');
    
    const coreHealthy = await verifyStabilizedHealth('http://localhost:3010/health/ready', 'Core API', 45);
    if (!coreHealthy) {
        console.error('❌ [Orchestrator] Core API failed to stabilize. Aborting.');
        cleanup();
        process.exit(1);
    }

    // 2. Auth Service (4005)
    await startService('pnpm', ['--filter', '@apps/auth-service', 'run', 'start'], '.', 'Auth Service');
    
    const authHealthy = await verifyStabilizedHealth('http://localhost:4005/health/ready', 'Auth Service', 30);
    if (!authHealthy) {
        console.error('❌ [Orchestrator] Auth Service failed to stabilize. Aborting.');
        cleanup();
        process.exit(1);
    }

    // 3. Worker (8082)
    await startService('pnpm', ['--filter', '@apps/worker', 'run', 'start'], '.', 'Worker');
    
    const workerHealthy = await verifyStabilizedHealth('http://localhost:8082/health/ready', 'Worker', 30);
    if (!workerHealthy) {
        console.error('❌ [Orchestrator] Worker failed to stabilize. Aborting.');
        cleanup();
        process.exit(1);
    }

    // 4. Gateway (3500)
    await startService('pnpm', ['--filter', '@apps/gateway', 'run', 'start'], '.', 'Gateway');

    const gatewayHealthy = await verifyStabilizedHealth('http://localhost:3500/health/ready', 'Gateway', 45);
    if (!gatewayHealthy) {
        console.error('❌ [Orchestrator] Gateway failed to stabilize. Aborting.');
        cleanup();
        process.exit(1);
    }

    // 5. Frontend (4200)
    console.log('🚀 Starting Frontend (Angular Development Server)...');
    await startService('pnpm', ['--filter', '@apps/stewardship-console', 'run', 'start'], '.', 'Frontend');

    const frontendHealthy = await verifyStabilizedHealth('http://localhost:4200', 'Frontend', 60);
    if (!frontendHealthy) {
        console.error('❌ [Orchestrator] Frontend failed to stabilize. Aborting.');
        cleanup();
        process.exit(1);
    }

    // Start background convergence monitoring
    startReconciliationLoop();

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║                ALL SERVICES OPERATIONAL                  ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log('║  👉 Stewardship Dashboard : http://localhost:4200       ║');
    console.log('║  👉 Express API Gateway    : http://localhost:3500       ║');
    console.log('║  👉 ZTAN Core API          : http://localhost:3010       ║');
    console.log('║  👉 Authenticated Auth API : http://localhost:4005       ║');
    console.log('║  👉 Bounded Worker Engine  : Running in background       ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
}

function cleanup() {
    isShuttingDown = true;
    console.log('\n🛑 Shutting down all orchestrated processes...');
    for (const p of processes) {
        console.log(`  Stopping ${p.name}...`);
        try {
            if (p.proc.pid !== undefined) {
                if (process.platform === 'win32') {
                    execSync(`taskkill /F /T /PID ${p.proc.pid}`, { stdio: 'ignore' });
                } else {
                    p.proc.kill('SIGKILL');
                }
            }
        } catch (e) {}
    }
    
    if (fs.existsSync(lockfilePath)) {
        try {
            fs.unlinkSync(lockfilePath);
        } catch (e) {}
    }
}

process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
});

process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
});

main().catch(err => {
    console.error('Fatal orchestration failure:', err);
    cleanup();
    process.exit(1);
});
