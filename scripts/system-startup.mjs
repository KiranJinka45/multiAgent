import { spawn, execSync, spawnSync } from 'node:child_process';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.env.NODE_ENV = 'production';

// 🔥 HARD GUARD: Prevent multiple instances of the orchestrator itself
if (process.env.MULTIAGENT_ORCHESTRATOR_ACTIVE === 'true') {
  console.log('⚠️ Orchestrator already active. Skipping duplicate start.');
  process.exit(0);
}
process.env.MULTIAGENT_ORCHESTRATOR_ACTIVE = 'true';

// Using relative path for binary to bypass Windows path length/mangling issues in shell
const TSX = 'node_modules\\.bin\\tsx.cmd'; 

console.log('\n=== 🚀 MultiAgent Hardened Boot (ESM v3) ===\n');

const processes = [];

function startProcess(name, appPath, args, customBin, retryCount = 0) {
  console.log(`🚀 Starting ${name} ${retryCount > 0 ? `(Retry ${retryCount})...` : '...'}`);
  
  let bin;
  if (customBin) {
    bin = customBin;
  } else {
    const relRoot = appPath.split('/').map(() => '..').join('/');
    bin = path.join(relRoot, TSX);
  }
  
  const proc = spawn(bin, args, { 
    cwd: path.join(process.cwd(), appPath),
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, SERVICE_NAME: name, NODE_ENV: 'development' }
  });

  proc.on('exit', (code) => { 
    if (code !== 0 && code !== null) { 
        console.error(`\n❌ ${name} exited with code ${code}`); 
        shutdown(); 
    } 
  });
  processes.push(proc);
}

async function waitForHealth(name, url, timeout) {
  console.log(`⏳ Waiting for ${name} health: ${url}`);
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
        const ok = await new Promise((resolve) => {
            const req = http.get(url, (res) => { 
                if (res.statusCode < 200 || res.statusCode >= 400) {
                    process.stdout.write(`(${res.statusCode})`);
                }
                resolve(res.statusCode >= 200 && res.statusCode < 400); 
            });
            req.on('error', () => resolve(false));
            req.setTimeout(10000, () => { req.destroy(); resolve(false); });
            req.end();
        });
        if (ok) { console.log(`\n✅ ${name} is healthy!`); return; }
    } catch (_) {}
    process.stdout.write('.');
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`\n❌ ${name} failed health check`);
}

function killPort(port) {
  console.log(`Sweep cleaning port ${port}...`);
  try {
    if (os.platform() === 'win32') {
        const pwsh = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
        const killCmd = `"${pwsh}" -Command "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"`;
        spawnSync(killCmd, { stdio: 'ignore', shell: true });
    }
  } catch (_) {}
}

function shutdown() {
  console.log('\n🛑 Shutting down MultiAgent...\n');
  const pwsh = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
  for (const proc of processes) { 
    try { 
        if (os.platform() === 'win32') {
            spawnSync(`"${pwsh}" -Command "Stop-Process -Id ${proc.pid} -Force -ErrorAction SilentlyContinue"`, { stdio: 'ignore', shell: true }); 
        } else {
            proc.kill('SIGTERM');
        }
    } catch (_) {} 
  }
  process.exit(1);
}

process.on('SIGINT', shutdown);

(async () => {
  try {
    killPort(3004); killPort(3011); killPort(9091); killPort(3006); killPort(4000);

    console.log('🔍 Health Check: Core Services...');
    
    // Check if TSX is available
    const rootBin = path.join(process.cwd(), TSX);
    
    // 🚀 1. Socket Server
    startProcess('Socket Server', 'apps/api-gateway', ['--tsconfig', 'tsconfig.json', 'services/socket.ts']);
    await waitForHealth('Socket Server', 'http://127.0.0.1:3011/health', 120000);

    // 🤖 2. Build Worker
    startProcess('Build Worker', 'apps/worker', ['--tsconfig', 'tsconfig.json', 'src/build-worker.ts']);
    
    // 🌐 3. Next.js Frontend
    startProcess('Frontend', 'apps/frontend', ['run', 'dev'], 'pnpm');
    await waitForHealth('Frontend', 'http://127.0.0.1:3004', 180000);

    console.log('\n🎉 SYSTEM FULLY OPERATIONAL\n');
    process.stdin.resume();
  } catch (err) { 
    console.error(`\n💥 BOOT FAILURE: ${err.message}`); 
    shutdown(); 
  }
})();
