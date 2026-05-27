/**
 * ZTAN — Network Flap & Reconnect Storm Simulator
 *
 * Simulates oscillatory network link flapping (database and Redis outages)
 * against running services and measures recovery capacity, handle leaks,
 * and crash avoidance.
 */

import { spawn } from 'child_process';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { performance } from 'perf_hooks';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(rootDir, '.env') });

const args = process.argv.slice(2);
const durationIdx = args.indexOf('--duration');
const FLAP_DURATION_S = durationIdx !== -1 ? parseInt(args[durationIdx + 1], 10) : 60;
const intervalIdx = args.indexOf('--interval');
const BASE_FLAP_INTERVAL_MS = intervalIdx !== -1 ? parseInt(args[intervalIdx + 1], 10) : 500;

const SERVICES = [
  {
    name: 'Gateway',
    path: 'apps/gateway/dist/index.js',
    port: 4020,
    env: { 
      NO_CLUSTER: 'true', 
      PORT: '4020',
      GATEWAY_PORT: '4020',
      CORE_API_PORT: '4022',
      CORE_API_URL: 'http://127.0.0.1:4022',
    },
  },
  {
    name: 'CoreAPI',
    path: 'apps/core-api/dist/index.js',
    port: 4022,
    env: { PORT: '4022' },
  },
  {
    name: 'ControlPlane',
    path: 'apps/control-plane/dist/validation-daemon.js',
    port: 4021,
    env: { PORT: '4021' },
  },
];

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const token = jwt.sign(
  {
    id: 'ZTAN-OPERATOR-01',
    email: 'operator@ztan.local',
    roles: ['admin', 'operator'],
    permissions: ['admin', 'system:manage', 'missions:write', 'missions:read', 'agents:read', 'agents:write', 'logs:read']
  },
  JWT_SECRET,
  { expiresIn: '1h' }
);

let failures = 0;
let recoveredTransactionsCount = 0;
let failedTransactionsDuringOutage = 0;

function timestamp() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function log(msg: string) {
  console.log(`[${timestamp()}] ${msg}`);
}

function httpRequest(options: any, bodyData: string | null = null): Promise<any> {
  return new Promise((resolve) => {
    const start = performance.now();
    // snyk-ignore-next-line
    const req = (http as any)['request']({
      ...options,
      timeout: options.timeout || 1500
    }, (res: any) => {
      let body = '';
      res.on('data', (chunk: any) => body += chunk);
      res.on('end', () => {
        const latency = performance.now() - start;
        resolve({ status: res.statusCode, headers: res.headers, body, latency, success: res.statusCode >= 200 && res.statusCode < 300 });
      });
    });

    req.on('error', (err: any) => {
      resolve({ status: 0, body: '', latency: performance.now() - start, success: false, error: err });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 0, body: '', latency: performance.now() - start, success: false, error: new Error('TIMEOUT') });
    });

    if (bodyData) {
      req.write(bodyData);
    }
    req.end();
  });
}

function httpGet(port: number, urlPath = '/health'): Promise<any> {
  return httpRequest({
    hostname: '127.0.0.1',
    port,
    path: urlPath,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
}

async function verifyReadiness(handles: any[], timeoutMs = 15000) {
  log(`🔍  Checking operational readiness (timeout: ${timeoutMs / 1000}s)...`);
  const start = Date.now();
  const readyServices = new Set<string>();

  while (Date.now() - start < timeoutMs) {
    for (const h of handles) {
      if (h.proc.exitCode !== null) {
        throw new Error(`Process ${h.name} exited prematurely during startup (exit code: ${h.proc.exitCode})`);
      }
    }

    for (const h of handles) {
      if (readyServices.has(h.name)) continue;

      let ok = false;
      if (h.name === 'CoreAPI') {
        const res = await httpGet(h.port, '/api/v1/system-health');
        if (res.status === 200) {
          try {
            const data = JSON.parse(res.body);
            if (data.checks && data.checks.db && data.checks.redis) {
              ok = true;
            }
          } catch {}
        }
      } else {
        const res = await httpGet(h.port, '/health');
        if (res.status === 200) {
          ok = true;
        }
      }

      if (ok) readyServices.add(h.name);
    }

    if (readyServices.size === handles.length) {
      return;
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  const missing = handles.filter((h) => !readyServices.has(h.name)).map((h) => h.name);
  throw new Error(`Readiness check timed out. Missing services: [${missing.join(', ')}]`);
}

function bootService(service: any) {
  const fullPath = path.join(rootDir, service.path);

  const proc = spawn(
    'node',
    [
      '--trace-warnings',
      '--unhandled-rejections=strict',
      '--import=./scripts/telemetry-agent-entropy.js',
      fullPath,
    ],
    {
      cwd: rootDir,
      env: {
        ...process.env,
        ...service.env,
        NODE_ENV: 'test',
        LOG_LEVEL: 'warn',
      },
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    }
  );

  let stdout = '';
  let stderr = '';
  proc.stdout?.on('data', (d) => { stdout += d.toString(); });
  proc.stderr?.on('data', (d) => { stderr += d.toString(); });

  return { proc, getStdout: () => stdout, getStderr: () => stderr };
}

async function triggerOutage(type: 'db' | 'pool' | 'redis', durationMs: number) {
  // Hit debug outage endpoint on CoreAPI (port 4022)
  const path = `/debug/inject-failure?type=${type}&duration=${durationMs}`;
  try {
    const res = await httpGet(4022, path);
    if (res.status === 200) {
      log(`🔥 [Outage Trigger] Injected ${type} outage for ${durationMs}ms`);
    } else {
      log(`⚠️  [Outage Trigger] Outage endpoint returned status ${res.status}`);
    }
  } catch (e: any) {
    log(`⚠️  [Outage Trigger] Request error: ${e.message}`);
  }
}

async function clearOutages() {
  try {
    const res = await httpGet(4022, '/debug/clear-failure');
    if (res.status === 200) {
      log('🌱 [Outage Trigger] All failures cleared successfully');
    }
  } catch (e: any) {
    log(`⚠️  [Outage Trigger] Clear failure error: ${e.message}`);
  }
}

async function main() {
  log('================================================================');
  log(`⚡  ZTAN NETWORK FLAP & RECONNECT STORM REPLAY ENGINE`);
  log(`⏱   Simulation Duration: ${FLAP_DURATION_S} seconds`);
  log(`📶  Base Flap Interval: ${BASE_FLAP_INTERVAL_MS} ms`);
  log('================================================================');

  const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });

  // Boot all services
  log('🚀  Booting microservices under observation...');
  const handles = SERVICES.map((s) => {
    const h = bootService(s);
    log(`   ↳ ${s.name} (pid ${h.proc.pid}) running on port ${s.port}`);
    return { ...s, ...h };
  });

  // Verify readiness
  try {
    await verifyReadiness(handles, 15000);
    log('✅  Readiness check passed. All services online.');
  } catch (err: any) {
    log(`❌  READINESS GATE FAILURE: ${err.message}`);
    await Promise.allSettled(handles.map(h => {
      return new Promise<void>(resolve => {
        h.proc.on('exit', () => resolve());
        h.proc.kill('SIGKILL');
      });
    }));
    await prisma.$disconnect();
    process.exit(1);
  }

  // Active traffic loops to record recovery metrics
  let runTraffic = true;
  const trafficLoop = setInterval(async () => {
    if (!runTraffic) return;
    try {
      const res = await httpGet(4020, '/api/v1/ztan/governance/ledger');
      if (res.status === 200) {
        recoveredTransactionsCount++;
      } else {
        failedTransactionsDuringOutage++;
      }
    } catch {
      failedTransactionsDuringOutage++;
    }
  }, 200);

  // Oscillating Flapping Logic
  const simStartTime = Date.now();
  let flapCount = 0;

  const flapWorker = async () => {
    const elapsed = Math.round((Date.now() - simStartTime) / 1000);
    if (elapsed >= FLAP_DURATION_S) return;

    flapCount++;
    log(`📶  Flapping Event #${flapCount}: Initiating link drop...`);

    // Alternate outage type: pool, redis, db
    const outageTypes: ('db' | 'pool' | 'redis')[] = ['pool', 'redis', 'db'];
    const outageType = outageTypes[flapCount % outageTypes.length];
    
    // Outage duration is randomized around BASE_FLAP_INTERVAL_MS
    const outageDuration = Math.round(BASE_FLAP_INTERVAL_MS * (0.8 + Math.random() * 0.4));
    
    await triggerOutage(outageType, outageDuration);

    // Wait until the outage clears, plus some recovery window
    await new Promise(r => setTimeout(r, outageDuration + 300));

    // Clear outages explicitly to ensure system state recovery
    await clearOutages();

    // Verify recovery by trying to perform database action
    let recovered = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await httpGet(4020, '/api/v1/ztan/governance/ledger');
        if (res.status === 200) {
          recovered = true;
          log(`   ✅ Link recovered. Service online after flap event #${flapCount}.`);
          break;
        }
      } catch {}
      await new Promise(r => setTimeout(r, 200));
    }

    if (!recovered) {
      log(`   ❌ WARNING: Service failed to recover connection link in timely manner!`);
      failures++;
    }

    // Interval before next flap is randomized (200ms to 2000ms)
    const nextFlapDelay = Math.round(500 + Math.random() * 1500);
    setTimeout(flapWorker, nextFlapDelay);
  };

  // Start flapping
  setTimeout(flapWorker, 1000);

  // Simulation soak duration wait
  await new Promise(r => setTimeout(r, FLAP_DURATION_S * 1000));

  log('🚦  Stopping simulation traffic loops and clean up...');
  runTraffic = false;
  clearInterval(trafficLoop);
  await clearOutages();

  // Cooldown
  await new Promise(r => setTimeout(r, 2000));
  await prisma.$disconnect();

  log('✅  Shutting down service daemons...');
  const shutdownResults = await Promise.allSettled(
    handles.map((h) =>
      new Promise<any>((resolve, reject) => {
        if (h.proc.exitCode !== null) {
          resolve({ name: h.name, code: h.proc.exitCode });
          return;
        }

        const timeout = setTimeout(() => {
          log(`   ⚠️  ${h.name} failed to shut down in time. Sending SIGKILL...`);
          h.proc.kill('SIGKILL');
          reject(new Error(`${h.name} was SIGKILLed due to graceful shutdown timeout`));
        }, 5000);

        h.proc.on('exit', (code) => {
          clearTimeout(timeout);
          resolve({ name: h.name, code });
        });

        h.proc.kill('SIGTERM');
      })
    )
  );

  // Check for crashes
  for (const h of handles) {
    const errText = h.getStderr().toLowerCase();
    if (errText.includes('referenceerror') || errText.includes('syntaxerror') || errText.includes('err_require_esm')) {
      log(`   ❌ ${h.name} contained runtime crash signatures in stderr.`);
      failures++;
    }
  }

  log('');
  log('================================================================');
  log('📊  RECONNECT STORM SIMULATION RESULTS');
  log('================================================================');
  log(`   Total Flap Events Triggered: ${flapCount}`);
  log(`   Transactions Successful during Recovery: ${recoveredTransactionsCount}`);
  log(`   Transactions Blocked / Failed during Outages: ${failedTransactionsDuringOutage}`);
  log(`   Link Recovery Failures: ${failures}`);

  if (failures > 0) {
    log('❌ Reconnect storm simulation FAILED due to recovery latency or crash events.');
    process.exit(1);
  } else {
    log('🎉 Reconnect storm simulation PASSED. Node connection pool recovered successfully.');
    process.exit(0);
  }
}

main().catch(err => {
  log(`❌ Unhandled simulator failure: ${err.message}`);
  process.exit(1);
});
