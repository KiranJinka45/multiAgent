const { spawn, execSync } = require('child_process');
const http = require('http');
const os = require('os');
const path = require('path');

process.env.NODE_ENV = 'production';

// 🔥 HARD GUARD: Prevent multiple instances of the orchestrator itself
if (process.env.MULTIAGENT_ORCHESTRATOR_ACTIVE === 'true') {
  console.log('⚠️ Orchestrator already active. Skipping duplicate start.');
  process.exit(0);
}
process.env.MULTIAGENT_ORCHESTRATOR_ACTIVE = 'true';

// Using relative path for binary to bypass Windows path length/mangling issues in shell
const TSX = 'node_modules\\.bin\\tsx.cmd'; 

console.log('\n=== 🚀 MultiAgent Hardened Boot (v2) ===\n');

const processes = [];

function startProcess(name, appPath, args, customBin, retryCount = 0) {
  console.log('🚀 Starting ' + name + (retryCount > 0 ? ` (Retry ${retryCount})...` : '...'));
  
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
        // If EADDRINUSE error is common, we might want to check the output
        // But for now, we'll just log and fail unless it's a known conflict
        console.error('\n❌ ' + name + ' exited with code ' + code); 
        shutdown(); 
    } 
  });
  processes.push(proc);
}

async function waitForHealth(name, url, timeout) {
  console.log('⏳ Waiting for ' + name + ' health: ' + url);
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
        const ok = await new Promise((resolve) => {
            const req = http.get(url, (res) => { 
                if (res.statusCode < 200 || res.statusCode >= 400) {
                    process.stdout.write(`(${res.statusCode})`);
                }
                // Leniency for dev servers (accept 2xx and 3xx redirects)
                resolve(res.statusCode >= 200 && res.statusCode < 400); 
            });
            req.on('error', () => resolve(false));
            req.setTimeout(10000, () => { req.destroy(); resolve(false); });
            req.end();
        });
        if (ok) { console.log('\n✅ ' + name + ' is healthy!'); return; }
    } catch (_) {}
    process.stdout.write('.');
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error('\n❌ ' + name + ' failed health check');
}

function killPort(port) {
  console.log(`🧹 Attempting cleanup of port ${port}...`);
  try {
    const { execSync } = require('child_process');
    if (os.platform() === 'win32') {
        const stdout = execSync(`netstat -ano | findstr :${port}`).toString().trim();
        if (stdout) {
          const lines = stdout.split('\n');
          const pids = new Set(lines.map(line => line.trim().split(/\s+/).pop()).filter(pid => pid && pid !== '0'));
          
          pids.forEach(pid => {
            try {
              execSync(`taskkill /PID ${pid} /F`);
              console.log(`✅ Forced termination of process ${pid} on port ${port}`);
            } catch (e) {}
          });
        }
        
        // Specially target Next.js and Orchestrator processes that might be hanging
        if (port === 3004 || port === 3011) {
            try {
              execSync('powershell -Command "Get-Process -Name next-dev, node | Where-Object { $_.CommandLine -like \'*3004*\' -or $_.CommandLine -like \'*3011*\' } -ErrorAction SilentlyContinue | Stop-Process -Force"', { stdio: 'ignore' });
            } catch(e){}
        }
    }
  } catch (_) {}
}

function shutdown() {
  console.log('\n🛑 Shutting down MultiAgent...\n');
  for (const proc of processes) { 
    try { 
        execSync('taskkill /pid ' + proc.pid + ' /F /T', { stdio: 'ignore' }); 
    } catch (_) {} 
  }
  process.exit(1);
}

process.on('SIGINT', shutdown);

(async () => {
  try {
    killPort(3004); killPort(3011);

    // 🔒 0. Database & Prisma Client Check
    console.log('🔍 Checking Database Health...');
    try {
      // Use tsx to verify DB directly from source
      execSync(`${TSX} -r tsconfig-paths/register -e "require('dotenv').config(); import('@packages/db').then(db => db.verifyConnection().then(ok => ok ? process.exit(0) : process.exit(1)))"`, { stdio: 'inherit' });
      console.log('✅ Database is ready.');
    } catch {
      console.log('⚠️ Database check failed or Prisma client missing. Attempting build...');
      execSync('pnpm --filter @packages/db run build', { stdio: 'inherit' });
    }

    // 🚀 1. Socket Server (Orchestrator)
    startProcess('Socket Server', 'apps/api-gateway', ['-r', 'tsconfig-paths/register', 'services/socket.ts']);
    await waitForHealth('Socket Server', 'http://127.0.0.1:3011/health', 300000);

    // 🤖 2. Build Worker (Task Execution)
    startProcess('Build Worker', 'apps/worker', ['-r', 'tsconfig-paths/register', 'src/build-worker.ts']);
    
    // 🌐 3. Next.js Frontend
    startProcess('Frontend', 'apps/frontend', ['run', 'dev'], 'pnpm');
    await waitForHealth('Frontend', 'http://127.0.0.1:3004', 180000);

    console.log('\n🎉 SYSTEM FULLY OPERATIONAL\n');
    process.stdin.resume();
  } catch (err) { 
    console.error('\n💥 BOOT FAILURE:', err.message); 
    shutdown(); 
  }
})();
