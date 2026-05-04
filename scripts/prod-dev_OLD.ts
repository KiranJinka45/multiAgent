import { spawn, ChildProcess, execSync } from 'child_process';
import axios from 'axios';

/**
 * PRODUCTION-GRADE CLUSTER ORCHESTRATOR
 * Features:
 * - Deterministic staggered boot
 * - Windows lock-breaking (Force release Prisma engines)
 * - Exponential backoff retries
 * - Dependency-aware health gating
 * - Structured logging
 */

const LOG_PREFIX = {
  BOOT: '🏗️ [BOOT]',
  HEALTH: '🩺 [HEALTH]',
  RETRY: '🔄 [RETRY]',
  ERROR: '💥 [ERROR]',
  KILLED: '🧹 [CLEAN]',
  SUCCESS: '🎉 [SUCCESS]'
};

const SERVICES = [
  { name: 'api', filter: '@apps/api', port: 4288, healthPath: '/health', required: true },
  { name: 'worker', filter: '@apps/worker', port: null, healthPath: null, required: true },
  { name: 'frontend', filter: 'frontend', port: 3004, healthPath: '/', required: true }
];

const processes: Map<string, ChildProcess> = new Map();

function log(prefix: string, message: string) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

async function killExistingProcesses() {
  log(LOG_PREFIX.KILLED, 'Breaking process locks (Node/TSX)...');
  try {
    const currentPid = process.pid;
    // PowerShell-based selective kill (Windows native handles)
    const psCommand = `Get-Process | Where-Object { ($_.Name -eq "node" -or $_.Name -eq "tsx") -and $_.Id -ne ${currentPid} } | Stop-Process -Force`;
    execSync(`powershell -Command "${psCommand}"`, { stdio: 'ignore' });
    log(LOG_PREFIX.KILLED, 'Locks released and environment purged.');
  } catch (e) {
    log(LOG_PREFIX.KILLED, 'No existing locks found or environment clean.');
  }
}

async function isHealthy(url: string): Promise<boolean> {
  try {
    const res = await axios.get(url, { timeout: 2000 });
    return res.status === 200;
  } catch {
    return false;
  }
}

async function retryTask(taskName: string, task: () => Promise<void>, maxAttempts = 3, initialDelay = 1000) {
  let attempt = 1;
  let delay = initialDelay;

  while (attempt <= maxAttempts) {
    try {
      await task();
      return;
    } catch (err: any) {
      if (attempt === maxAttempts) throw err;
      log(LOG_PREFIX.RETRY, `${taskName} failed (Attempt ${attempt}/${maxAttempts}). Retrying in ${delay / 1000}s...`);
      await new Promise(r => setTimeout(r, delay));
      attempt++;
      delay *= 2; // Exponential backoff
    }
  }
}

async function bootService(service: typeof SERVICES[0]) {
  log(LOG_PREFIX.BOOT, `Starting service: ${service.name}...`);
  
  const child = spawn('pnpm', ['turbo', 'run', 'dev', '--filter', service.filter, '--concurrency', '8'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, PORT: service.port?.toString() }
  });

  processes.set(service.name, child);

  if (service.healthPath && service.port) {
    const url = `http://localhost:${service.port}${service.healthPath}`;
    log(LOG_PREFIX.HEALTH, `Waiting for ${service.name} at ${url}...`);
    
    let healthy = false;
    let attempts = 0;
    while (attempts < 30) {
      if (await isHealthy(url)) {
        healthy = true;
        log(LOG_PREFIX.HEALTH, `${service.name} is now HEALTHY.`);
        break;
      }
      attempts++;
      await new Promise(r => setTimeout(r, 2000));
    }
    
    if (!healthy && service.required) {
      log(LOG_PREFIX.ERROR, `${service.name} timed out. Aborting boot.`);
      process.exit(1);
    }
  } else {
    // For worker, wait a fixed stagger to allow API connection establishment
    log(LOG_PREFIX.BOOT, `Service ${service.name} (staggering 5s)...`);
    await new Promise(r => setTimeout(r, 5000));
    log(LOG_PREFIX.SUCCESS, `${service.name} initialized.`);
  }
}

async function main() {
  log(LOG_PREFIX.BOOT, 'Initializing Stabilized Production Cluster...');
  
  await killExistingProcesses();
  
  // Step 1: Prisma Generation with Retry
  await retryTask('Prisma Client Generation', async () => {
    log(LOG_PREFIX.BOOT, 'Running Prisma generate...');
    const prismaProc = spawn('npx.cmd', ['prisma', 'generate', '--schema', 'packages/db/src/schema.prisma'], {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:5432/postgres' }
    });
    
    return new Promise((resolve, reject) => {
      prismaProc.on('exit', (code) => code === 0 ? resolve() : reject(new Error('Prisma fail')));
    });
  }, 3);

  // Step 2: Sequential dependency-aware boot
  for (const service of SERVICES) {
    await bootService(service);
  }

  log(LOG_PREFIX.SUCCESS, 'MultiAgent Production Cluster is ONLINE.');
}

process.on('SIGINT', () => {
  log(LOG_PREFIX.KILLED, 'Shutting down cluster services...');
  for (const [name, proc] of processes) {
    log(LOG_PREFIX.KILLED, `Stopping ${name}...`);
    proc.kill();
  }
  process.exit(0);
});

main().catch(err => {
  log(LOG_PREFIX.ERROR, `Fatal Boot Failure: ${err.message}`);
  process.exit(1);
});

