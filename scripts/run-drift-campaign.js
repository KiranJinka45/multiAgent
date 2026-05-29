/**
 * ZTAN Phase 13 — Long-Duration Telemetry Drift Campaign Runner
 *
 * Runs a stable nominal workload, samples telemetry from HostDaemon, Gateway, CoreAPI,
 * and ControlPlane, computes linear regression slopes for memory growth and handle leaks,
 * and saves structured reports under .ztan/evidence-vault/drift-histories/.
 */

import { spawn, execSync } from 'child_process';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import net from 'net';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { classifyVerdict } from './verdict-classifier.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(rootDir, '.env') });

const activeHandles = [];

function emergencyCleanup() {
  for (const h of activeHandles) {
    try {
      if (h.proc && h.proc.exitCode === null) {
        h.proc.kill('SIGKILL');
      }
    } catch { /* best effort */ }
  }
}

process.on('exit', emergencyCleanup);
process.on('SIGINT', () => { emergencyCleanup(); process.exit(130); });
process.on('SIGTERM', () => { emergencyCleanup(); process.exit(143); });
process.on('uncaughtException', (err) => {
  console.error('\n💥 Uncaught exception in drift campaign orchestrator:', err);
  emergencyCleanup();
  process.exit(1);
});

// Arguments & Config
const args = process.argv.slice(2);
const durationIdx = args.indexOf('--duration');
const CAMPAIGN_DURATION_S = durationIdx !== -1 ? parseInt(args[durationIdx + 1], 10) : 30;
const CAMPAIGN_DURATION_MS = CAMPAIGN_DURATION_S * 1000;
const TELEMETRY_INTERVAL_MS = 2000; // sample every 2s

const SERVICES = [
  {
    name: 'HostDaemon',
    path: 'packages/runtime-core/dist/supervisor/host-daemon.js',
    port: 5050,
    env: {}
  },
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

const JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_ztan';
const token = jwt.sign(
  {
    id: 'ZTAN-OPERATOR-01',
    email: 'operator@ztan.local',
    roles: ['admin', 'operator'],
    permissions: ['admin', 'system:manage', 'missions:write', 'missions:read']
  },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const telemetry = new Map();
SERVICES.forEach((s) => telemetry.set(s.name, []));

const requestTraceLog = [];

function timestamp() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function log(msg) {
  console.log(`[${timestamp()}] ${msg}`);
}

function httpRequest(options, bodyData = null) {
  return new Promise((resolve) => {
    const start = Date.now();
    const req = http.request({
      ...options,
      timeout: options.timeout || 2500
    }, (res) => {
      let body = '';
      res.on('data', (d) => (body += d));
      res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers, latency: Date.now() - start }));
    });
    
    req.on('error', (err) => resolve({ status: 0, body: '', latency: Date.now() - start, error: err }));
    req.on('timeout', () => { 
      req.destroy(); 
      resolve({ status: 0, body: '', latency: Date.now() - start, error: new Error('Timeout') }); 
    });

    if (bodyData) {
      req.write(bodyData);
    }
    req.end();
  });
}

function checkPortBound(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => {
      resolve(false);
    });
    socket.connect(port, '127.0.0.1');
  });
}

async function verifyReadiness(handles, timeoutMs = 20000) {
  log(`🔍  Checking operational readiness state machine (timeout: ${timeoutMs / 1000}s, polling: 500ms)...`);
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    let allStable = true;
    for (const h of handles) {
      if (h.proc.exitCode !== null) {
        throw new Error(`Process ${h.name} exited prematurely during startup (exit code: ${h.proc.exitCode})`);
      }
      const bound = await checkPortBound(h.port);
      if (!bound) {
        allStable = false;
      }
    }
    if (allStable) {
      log('🎉  Global orchestration convergence achieved: all services are port-bound!');
      return;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Readiness check timed out: not all ports bound.');
}

function bootService(service) {
  const fullPath = path.join(rootDir, service.path);
  const proc = spawn(
    'node',
    [
      '--trace-warnings',
      '--unhandled-rejections=strict',
      '--import=./scripts/telemetry-agent.js',
      fullPath,
    ],
    {
      cwd: rootDir,
      env: {
        ...process.env,
        ...service.env,
        NODE_ENV: 'test',
        LOG_LEVEL: 'warn',
        JWT_SECRET
      },
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    }
  );

  let stdout = '';
  let stderr = '';
  proc.stdout.on('data', (d) => { stdout += d.toString(); });
  proc.stderr.on('data', (d) => { stderr += d.toString(); });
 
  proc.on('message', (report) => {
    if (report && report.type === 'TELEMETRY_REPORT') {
      telemetry.get(service.name).push(report);
    }
  });
 
  return { proc, getStdout: () => stdout, getStderr: () => stderr };
}

// Simple Linear Regression helper to compute slope (y = mx + b -> returns m)
function computeSlope(samples) {
  const n = samples.length;
  if (n < 2) return 0;
  
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  
  for (let i = 0; i < n; i++) {
    const x = samples[i].x;
    const y = samples[i].y;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }
  
  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return 0;
  
  return (n * sumXY - sumX * sumY) / denominator;
}

async function main() {
  log('='.repeat(64));
  log(`🧪  ZTAN LONG-DURATION DRIFT CAMPAIGN — ${CAMPAIGN_DURATION_S}s duration`);
  log('='.repeat(64));

  try {
    execSync('npx tsx scripts/preflight-cleanup.ts', { stdio: 'ignore' });
  } catch {}

  let handles = [];
  const startCampaign = Date.now();

  try {
    // 1. Boot services
    log('🚀  Booting services with preloaded telemetry agents...');
    handles = SERVICES.map((s) => {
      const h = bootService(s);
      log(`   ↳ ${s.name} (pid ${h.proc.pid}) on port ${s.port}`);
      const handle = { ...s, ...h };
      activeHandles.push(handle);
      return handle;
    });

    await verifyReadiness(handles, 20000);

    // 2. Telemetry sampling loop
    const telemetryTimer = setInterval(() => {
      for (const h of handles) {
        if (h.proc.exitCode !== null) continue;
        try {
          h.proc.send({ type: 'QUERY_TELEMETRY' });
        } catch {}
      }
    }, TELEMETRY_INTERVAL_MS);

    // 3. Workload generator (RPS load: GET /health @ 5 Hz)
    log('🚦  Launching continuous workload (5 Hz cached reads)...');
    let runTraffic = true;
    const trafficTimer = setInterval(async () => {
      if (!runTraffic) return;
      const reqStart = Date.now();
      const trace = { timestamp: reqStart, success: false, status: 0, latency: 0 };
      try {
        const res = await httpRequest({
          hostname: '127.0.0.1',
          port: 4020,
          path: '/health',
          method: 'GET',
          timeout: 1000
        });
        trace.latency = res.latency;
        trace.status = res.status;
        if (res.status === 200) trace.success = true;
      } catch {
        trace.latency = Date.now() - reqStart;
      }
      requestTraceLog.push(trace);
    }, 200);

    // 4. Wait for duration
    log(`⏳  Running campaign soak loop...`);
    await new Promise((r) => setTimeout(r, CAMPAIGN_DURATION_MS));

    // Stop traffic
    runTraffic = false;
    clearInterval(trafficTimer);
    clearInterval(telemetryTimer);
    log('🚦  Workload stopped. Shuts down daemons cascade...');

  } catch (err) {
    log(`❌  CRITICAL RUNTIME ERROR: ${err.message}`);
  } finally {
    // SIGTERM cascade
    log('🛑  Terminating all processes gracefully...');
    const shutdownResults = await Promise.allSettled(
      handles.map(
        (h) =>
          new Promise((resolve, reject) => {
            if (h.proc.exitCode !== null) {
              resolve({ name: h.name, code: h.proc.exitCode });
              return;
            }
            const timeout = setTimeout(() => {
              h.proc.kill('SIGKILL');
              reject(new Error(`${h.name} failed SIGTERM, killed via SIGKILL`));
            }, 5000);

            h.proc.on('exit', (code) => {
              clearTimeout(timeout);
              resolve({ name: h.name, code });
            });
            h.proc.kill('SIGTERM');
          })
      )
    );

    // Analyze Drift Slopes
    log('\n📈  Analyzing Telemetry Drift Slopes...');
    const serviceDrifts = {};

    for (const [name, entries] of telemetry) {
      if (entries.length < 2) {
        log(`   ⚠️  ${name}: Insufficient snapshots collected (${entries.length})`);
        continue;
      }

      const first = entries[0];
      const last = entries[entries.length - 1];

      const rssStart = first.memory.rss;
      const rssEnd = last.memory.rss;
      const heapStart = first.memory.heapUsed;
      const heapEnd = last.memory.heapUsed;
      const handleStart = first.handles.length;
      const handleEnd = last.handles.length;

      // Calculate simple regression slopes over time (x = seconds from start)
      const rssSamples = entries.map(e => ({ x: (e.timestamp - startCampaign) / 1000, y: e.memory.rss / 1024 / 1024 }));
      const heapSamples = entries.map(e => ({ x: (e.timestamp - startCampaign) / 1000, y: e.memory.heapUsed / 1024 / 1024 }));
      const handleSamples = entries.map(e => ({ x: (e.timestamp - startCampaign) / 1000, y: e.handles.length }));

      const rssSlopeMBs = computeSlope(rssSamples); // MB per second
      const heapSlopeMBs = computeSlope(heapSamples); // MB per second
      const handleSlopeSec = computeSlope(handleSamples); // handles per second

      // Extrapolate to Hourly rates
      const rssSlopePerHour = rssSlopeMBs * 3600;
      const heapSlopePerHour = heapSlopeMBs * 3600;
      const handleSlopePerHour = handleSlopeSec * 3600;

      log(`   ${name}:`);
      log(`      ↳ Heap growth rate: ${heapSlopePerHour.toFixed(4)} MB/hour`);
      log(`      ↳ RSS growth rate:  ${rssSlopePerHour.toFixed(4)} MB/hour`);
      log(`      ↳ Handle leak rate: ${handleSlopePerHour.toFixed(4)} handles/hour`);

      serviceDrifts[name] = {
        heapSlopePerHour,
        rssSlopePerHour,
        handleSlopePerHour,
        rssDeltaMB: (rssEnd - rssStart) / 1024 / 1024,
        heapDeltaMB: (heapEnd - heapStart) / 1024 / 1024,
        handleDelta: handleEnd - handleStart,
        latestHandles: last.handles
      };
    }

    // Save report to .ztan/evidence-vault/drift-histories/
    const vaultDir = path.join(rootDir, '.ztan', 'evidence-vault', 'drift-histories');
    if (!fs.existsSync(vaultDir)) {
        fs.mkdirSync(vaultDir, { recursive: true });
    }

    const reportFile = path.join(vaultDir, `drift-report-${Date.now()}.json`);
    const report = {
      timestamp: new Date().toISOString(),
      durationSeconds: CAMPAIGN_DURATION_S,
      services: SERVICES.map(s => s.name),
      serviceDrifts,
      requestMetrics: {
        totalRequests: requestTraceLog.length,
        successRate: requestTraceLog.length > 0 ? (requestTraceLog.filter(t => t.success).length / requestTraceLog.length * 100).toFixed(2) : '100.00'
      }
    };

    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2), 'utf8');
    
    // Also write a symlink/pointer file for "latest"
    const latestFile = path.join(vaultDir, 'drift-report-latest.json');
    fs.writeFileSync(latestFile, JSON.stringify(report, null, 2), 'utf8');

    log(`💾  Drift history report archived to ${path.relative(rootDir, reportFile)}`);
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal drift campaign orchestrator error:', err);
  process.exit(1);
});
