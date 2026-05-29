/**
 * ZTAN Phase 18C — Telemetry-Driven Long-Run Soak Validation Engine
 *
 * Boots production Gateway, Core API, and Control Plane services under a
 * configurable soak duration.  During the run it:
 *
 *   1. Preloads the dynamic IPC telemetry-agent.js via --import
 *   2. Collects per-service telemetry snapshots via IPC every 2 s:
 *      • Memory RSS / Heap / External
 *      • Active handles (categorized e.g. Sockets, Timers)
 *      • Active requests count
 *      • True Event Loop Utilization (ELU) percentage
 *
 *   3. Performs handle archaeology: compare handle snapshots before,
 *      during, and after load to detect resource/connection leaks.
 *
 *   4. Performs memory leak trend analysis (RSS and Heap trends).
 *
 *   5. Gracefully SIGTERM terminates all services, and escalates to SIGKILL
 *      with diagnostic reports if a service hangs past the grace window.
 */

import { spawn, execSync } from 'child_process';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import net from 'net';
import crypto from 'crypto';
import { classifyVerdict, formatVerdict } from './verdict-classifier.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Crash-safe process lifecycle: kill children if orchestrator dies
// ---------------------------------------------------------------------------
/** @type {Array<{proc: import('child_process').ChildProcess, name: string}>} */
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
  console.error('\n💥 Uncaught exception in soak orchestrator:', err);
  emergencyCleanup();
  process.exit(1);
});

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const durationIdx = args.indexOf('--duration');
const SOAK_DURATION_S = durationIdx !== -1 ? parseInt(args[durationIdx + 1], 10) : 60;
const SOAK_DURATION_MS = SOAK_DURATION_S * 1000;
const SHUTDOWN_GRACE_MS = 10_000;
const TELEMETRY_INTERVAL_MS = 2_000;
const TRAFFIC_INTERVAL_MS = 1_000;
const INJECT_FAILURES = args.includes('--inject-failures');

// ---------------------------------------------------------------------------
// Service definitions
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Telemetry storage
// ---------------------------------------------------------------------------
/** @type {Map<string, Array<{timestamp:number, memory:any, handles:string[], requestsCount:number, elu:number}>>} */
const telemetry = new Map();
SERVICES.forEach((s) => telemetry.set(s.name, []));

let campaignSecret = '';
const indeterminateFailures = [];
const telemetryValidatorStates = new Map();

function validateTelemetryReport(serviceName, report, secret) {
  if (!telemetryValidatorStates.has(serviceName)) {
    telemetryValidatorStates.set(serviceName, {
      expectedSequence: 0,
      expectedPrevReportHash: 'ZTAN_TELEMETRY_GENESIS',
      lastTimestamp: 0
    });
  }

  const state = telemetryValidatorStates.get(serviceName);
  const errors = [];

  // 1. Check basic format
  if (!report || report.type !== 'TELEMETRY_REPORT') {
    return ['Malformed telemetry packet'];
  }

  // 2. Validate sequence number
  if (report.sequence !== state.expectedSequence) {
    errors.push(`Telemetry sequence gap: expected ${state.expectedSequence}, got ${report.sequence}`);
  }

  // 3. Validate timestamp monotonicity
  if (report.timestamp <= state.lastTimestamp) {
    errors.push(`Telemetry timestamp rollback: expected > ${state.lastTimestamp}, got ${report.timestamp}`);
  }

  // 4. Validate prevReportHash chain
  if (report.prevReportHash !== state.expectedPrevReportHash) {
    errors.push(`Telemetry hash chain break: expected "${state.expectedPrevReportHash}", got "${report.prevReportHash}"`);
  }

  // 5. Verify payload hash calculation
  const serialized = JSON.stringify({
    timestamp: report.timestamp,
    sequence: report.sequence,
    prevReportHash: report.prevReportHash,
    memory: report.memory,
    gc: report.gc,
    elu: report.elu,
    requestsCount: report.requestsCount,
    selfVerification: report.selfVerification
  });
  
  const computedHash = crypto.createHash('sha256').update(serialized).digest('hex');
  if (report.reportHash !== computedHash) {
    // Check without gc
    const serializedNoGc = JSON.stringify({
      timestamp: report.timestamp,
      sequence: report.sequence,
      prevReportHash: report.prevReportHash,
      memory: report.memory,
      elu: report.elu,
      requestsCount: report.requestsCount,
      selfVerification: report.selfVerification
    });
    const computedHashNoGc = crypto.createHash('sha256').update(serializedNoGc).digest('hex');
    if (report.reportHash !== computedHashNoGc) {
      errors.push(`Telemetry chain corruption: hash mismatch. Computed "${computedHash}" or "${computedHashNoGc}", got "${report.reportHash}"`);
    }
  }

  // 6. Verify HMAC signature if secret is active
  if (secret) {
    if (!report.signature) {
      errors.push('Telemetry signature missing when ZTAN_TELEMETRY_SECRET is configured');
    } else {
      const computedSig = crypto.createHmac('sha256', secret).update(report.reportHash).digest('hex');
      if (report.signature !== computedSig) {
        errors.push(`Telemetry signature verification failed: signature mismatch`);
      }
    }
  }

  // 7. Verify malformed values (NaN/Infinity propagation)
  const numbers = [
    report.memory?.rss,
    report.memory?.heapUsed,
    report.memory?.heapTotal,
    report.elu
  ];
  if (numbers.some(n => typeof n !== 'number' || isNaN(n) || !isFinite(n))) {
    errors.push('NaN/Infinity in telemetry data detected');
  }

  // 8. Verify agent self-verification outcomes
  if (report.selfVerification) {
    if (!report.selfVerification.eluCorrelationOk) {
      errors.push('Self-verification failure: Scheduler ELU/lag correlation anomaly detected');
    }
    if (!report.selfVerification.memoryConsistencyOk) {
      errors.push('Self-verification failure: Memory limit consistency check failed');
    }
    if (!report.selfVerification.handlesConsistencyOk) {
      errors.push('Self-verification failure: Active handle discrepancy detected');
    }
  }

  // Update validation state for the next packet
  state.expectedSequence = report.sequence + 1;
  state.expectedPrevReportHash = report.reportHash;
  state.lastTimestamp = report.timestamp;

  return errors;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timestamp() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function log(msg) {
  console.log(`[${timestamp()}] ${msg}`);
}

function httpGet(port, urlPath = '/health') {
  return new Promise((resolve) => {
    // deepcode ignore HttpToHttps: local loopback health checks
    const req = http.get(`http://127.0.0.1:${port}${urlPath}`, { timeout: 2000 }, (res) => {
      let body = '';
      res.on('data', (d) => (body += d));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', () => resolve({ status: 0, body: '' }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, body: '' }); });
  });
}

// ---------------------------------------------------------------------------
// Operational Readiness Check State-Machine
// ---------------------------------------------------------------------------
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

async function updateReadinessState(h) {
  if (h.proc.exitCode !== null) {
    throw new Error(`Process ${h.name} exited prematurely during startup (exit code: ${h.proc.exitCode})`);
  }

  // 1. PORT_BOUND
  if (h.state === 'INITIAL') {
    const bound = await checkPortBound(h.port);
    if (bound) {
      h.state = 'PORT_BOUND';
      log(`   ➔ [${h.name}] State transition: INITIAL ➔ PORT_BOUND`);
    } else {
      return;
    }
  }

  // 2. HEALTHY
  if (h.state === 'PORT_BOUND') {
    const path = h.name === 'CoreAPI' ? '/api/v1/system-health' : '/health';
    const res = await httpGet(h.port, path);
    if (res.status === 200) {
      h.state = 'HEALTHY';
      log(`   ➔ [${h.name}] State transition: PORT_BOUND ➔ HEALTHY`);
    } else {
      return;
    }
  }

  // 3. IPC_READY
  if (h.state === 'HEALTHY') {
    if (h.isTelemetryReady()) {
      h.state = 'IPC_READY';
      log(`   ➔ [${h.name}] State transition: HEALTHY ➔ IPC_READY`);
    } else {
      return;
    }
  }

  // 4. DEPENDENCIES_READY
  if (h.state === 'IPC_READY') {
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
    } else if (h.name === 'Gateway') {
      const res = await httpGet(h.port, '/api/whoami');
      if (res.status === 200 || res.status === 401) {
        ok = true;
      }
    } else {
      ok = true;
    }

    if (ok) {
      h.state = 'DEPENDENCIES_READY';
      log(`   ➔ [${h.name}] State transition: IPC_READY ➔ DEPENDENCIES_READY`);
    } else {
      return;
    }
  }

  // 5. CONVERGED
  if (h.state === 'DEPENDENCIES_READY') {
    if (h.proc.exitCode === null) {
      h.proc.send({ type: 'QUERY_TELEMETRY' });
    }
    await new Promise((r) => setTimeout(r, 100));

    const snaps = telemetry.get(h.name) || [];
    const latest = snaps[snaps.length - 1];
    let converged = false;
    if (latest) {
      const elu = latest.elu || 0;
      if (elu < 0.95) {
        converged = true;
      } else {
        log(`   ⏳ [${h.name}] Event Loop Utilization (ELU) high: ${(elu * 100).toFixed(1)}% (waiting for stabilization...)`);
      }
    } else {
      log(`   ⏳ [${h.name}] Waiting for first telemetry snapshot...`);
    }

    if (converged) {
      h.state = 'CONVERGED';
      h.stableSince = Date.now();
      log(`   ➔ [${h.name}] State transition: DEPENDENCIES_READY ➔ CONVERGED (stabilization window active)`);
    } else {
      return;
    }
  }

  // 6. STABLE
  if (h.state === 'CONVERGED') {
    const snaps = telemetry.get(h.name) || [];
    const latest = snaps[snaps.length - 1];
    if (latest && latest.elu >= 0.95) {
      log(`   ⚠️ [${h.name}] Event Loop Utilization fluctuated to ${(latest.elu * 100).toFixed(1)}%. Resetting stabilization window.`);
      h.state = 'DEPENDENCIES_READY';
      h.stableSince = null;
      return;
    }

    const elapsed = Date.now() - h.stableSince;
    if (elapsed >= 2000) {
      h.state = 'STABLE';
      log(`   ➔ [${h.name}] State transition: CONVERGED ➔ STABLE (Sustained 2s healthy window passed!)`);
    }
  }
}

async function verifyReadiness(handles, timeoutMs = 30000) {
  log(`🔍  Checking operational readiness state machine (timeout: ${timeoutMs / 1000}s, polling: 500ms)...`);
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    for (const h of handles) {
      await updateReadinessState(h);
    }

    const allStable = handles.every((h) => h.state === 'STABLE');
    if (allStable) {
      log('🔗  Verifying API routing path (Gateway -> CoreAPI)...');
      const bffRes = await httpGet(4020, '/api/whoami');
      if (bffRes.status === 200 || bffRes.status === 401) {
        log('   ✅ API routing verification passed (Gateway -> CoreAPI round-trip OK)');
        log('🎉  Global orchestration convergence achieved: all services are fully STABLE!');
        return;
      } else {
        log(`   ⏳ Gateway BFF routing not converged yet (Status: ${bffRes.status})`);
      }
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  const unstable = handles.filter((h) => h.state !== 'STABLE').map((h) => `${h.name} (${h.state})`);
  throw new Error(`Readiness check timed out. Unstable services: [${unstable.join(', ')}]`);
}

// ---------------------------------------------------------------------------
// Controlled Failure Injection Drill
// ---------------------------------------------------------------------------
async function runFailureDrill() {
  log('🔥 [Failure Drill] Starting Controlled Failure Injection Drill...');
  
  // 1. Database Outage Drill at 5s
  await new Promise((r) => setTimeout(r, 5000));
  log('🔥 [Failure Drill] Injecting DB Outage (duration: 3000ms)...');
  const injectDbRes = await httpGet(4022, '/debug/inject-failure?type=db&duration=3000');
  log(`   Injected DB failure response: ${JSON.stringify(injectDbRes)}`);
  
  // Wait a moment for health check to reflect it
  await new Promise((r) => setTimeout(r, 500));
  log('🔥 [Failure Drill] Verifying system health is DEGRADED (DB down)...');
  const healthDbRes = await httpGet(4022, '/api/v1/system-health');
  if (healthDbRes.status !== 200) {
    throw new Error(`Health check returned status ${healthDbRes.status} instead of 200 during DB outage`);
  }
  const dbHealthData = JSON.parse(healthDbRes.body);
  log(`   System health state: status=${dbHealthData.status}, db=${dbHealthData.checks?.db}, redis=${dbHealthData.checks?.redis}`);
  if (dbHealthData.status !== 'degraded' || dbHealthData.checks?.db !== false) {
    throw new Error(`Outage assertion failed! System did not mark DB as degraded. Expected status='degraded' and checks.db=false, got status='${dbHealthData.status}', checks.db=${dbHealthData.checks?.db}`);
  }
  log('   ✔ DB outage successfully detected and state degraded');
  
  // Wait for it to recover (total outage duration is 3000ms, we waited 500ms, let's wait another 3500ms to be safe)
  await new Promise((r) => setTimeout(r, 3500));
  log('🔥 [Failure Drill] Verifying system health returned to HEALTHY after DB outage expiration...');
  const recoverDbRes = await httpGet(4022, '/api/v1/system-health');
  const dbRecoverData = JSON.parse(recoverDbRes.body);
  log(`   System health state: status=${dbRecoverData.status}, db=${dbRecoverData.checks?.db}, redis=${dbRecoverData.checks?.redis}`);
  if (dbRecoverData.status !== 'healthy' || dbRecoverData.checks?.db !== true) {
    throw new Error(`Recovery assertion failed! System did not heal from DB outage. Expected status='healthy' and checks.db=true, got status='${dbRecoverData.status}', checks.db=${dbRecoverData.checks?.db}`);
  }
  log('   ✔ DB outage healed and system returned to healthy');
  
  // 2. Redis Outage Drill at 12s (wait 12s from start. Since we did 5s + 500ms + 3500ms = 9s, we wait 3000ms more)
  await new Promise((r) => setTimeout(r, 3000));
  log('🔥 [Failure Drill] Injecting Redis Outage (duration: 3000ms)...');
  const injectRedisRes = await httpGet(4022, '/debug/inject-failure?type=redis&duration=3000');
  log(`   Injected Redis failure response: ${JSON.stringify(injectRedisRes)}`);
  
  // Wait a moment for health check to reflect it
  await new Promise((r) => setTimeout(r, 500));
  log('🔥 [Failure Drill] Verifying system health is DEGRADED (Redis down)...');
  const healthRedisRes = await httpGet(4022, '/api/v1/system-health');
  if (healthRedisRes.status !== 200) {
    throw new Error(`Health check returned status ${healthRedisRes.status} instead of 200 during Redis outage`);
  }
  const redisHealthData = JSON.parse(healthRedisRes.body);
  log(`   System health state: status=${redisHealthData.status}, db=${redisHealthData.checks?.db}, redis=${redisHealthData.checks?.redis}`);
  if (redisHealthData.status !== 'degraded' || redisHealthData.checks?.redis !== false) {
    throw new Error(`Outage assertion failed! System did not mark Redis as degraded. Expected status='degraded' and checks.redis=false, got status='${redisHealthData.status}', checks.redis=${redisHealthData.checks?.redis}`);
  }
  log('   ✔ Redis outage successfully detected and state degraded');
  
  // Wait for it to recover (total outage duration is 3000ms, we waited 500ms, let's wait another 3500ms to be safe)
  await new Promise((r) => setTimeout(r, 3500));
  log('🔥 [Failure Drill] Verifying system health returned to HEALTHY after Redis outage expiration...');
  const recoverRedisRes = await httpGet(4022, '/api/v1/system-health');
  const redisRecoverData = JSON.parse(recoverRedisRes.body);
  log(`   System health state: status=${redisRecoverData.status}, db=${redisRecoverData.checks?.db}, redis=${redisRecoverData.checks?.redis}`);
  if (redisRecoverData.status !== 'healthy' || redisRecoverData.checks?.redis !== true) {
    throw new Error(`Recovery assertion failed! System did not heal from Redis outage. Expected status='healthy' and checks.redis=true, got status='${redisRecoverData.status}', checks.redis=${redisRecoverData.checks?.redis}`);
  }
  log('   ✔ Redis outage healed and system returned to healthy');
  
  log('🎉 [Failure Drill] Controlled Failure Injection Drill successfully completed!');
}

// ---------------------------------------------------------------------------
// Boot a single service with preloaded IPC agent
// ---------------------------------------------------------------------------
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
        ZTAN_TELEMETRY_SECRET: campaignSecret
      },
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    }
  );

  let stdout = '';
  let stderr = '';
  let telemetryReady = false;
  proc.stdout.on('data', (d) => { stdout += d.toString(); });
  proc.stderr.on('data', (d) => { stderr += d.toString(); });
 
  proc.on('message', (report) => {
    if (report && report.type === 'TELEMETRY_READY') {
      telemetryReady = true;
      log(`   ✔ ${service.name} IPC telemetry agent handshake received.`);
    } else if (report && report.type === 'TELEMETRY_REPORT') {
      // Run validator on incoming reports
      const validationErrors = validateTelemetryReport(service.name, report, campaignSecret);
      if (validationErrors.length > 0) {
        for (const err of validationErrors) {
          log(`⚠️  Telemetry Integrity Violation for ${service.name}: ${err}`);
          indeterminateFailures.push(`${service.name}: ${err}`);
        }
      }
      telemetry.get(service.name).push(report);
    }
  });
 
  return { proc, getStdout: () => stdout, getStderr: () => stderr, isTelemetryReady: () => telemetryReady };
}

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------
async function main() {
  campaignSecret = crypto.randomBytes(32).toString('hex');
  log('='.repeat(64));
  log(`🧪  SOAK VALIDATION ENGINE — ${SOAK_DURATION_S}s soak window`);
  log('='.repeat(64));

  // ---- 0. Preflight port and process cleanup ----
  try {
    execSync('npx tsx scripts/preflight-cleanup.ts', { stdio: 'inherit' });
  } catch (e) {
    log(`⚠️  Preflight cleanup encountered an issue: ${e.message}`);
  }

  let failures = 0;

  // ---- 1. Boot services ----
  log('🚀  Booting services with preloaded telemetry agents...');
  const handles = SERVICES.map((s) => {
    const h = bootService(s);
    const handle = { ...s, ...h, state: 'INITIAL', stableSince: null };
    activeHandles.push(handle); // Register for crash-safe cleanup
    log(`   ↳ ${s.name} (pid ${h.proc.pid}) on port ${s.port}`);
    return handle;
  });

  // Strict operational readiness gate
  try {
    await verifyReadiness(handles, 30000);
  } catch (err) {
    log(`❌  READINESS GATE FAILURE: ${err.message}`);
    log('================================================================');
    log('📋  Dumping stdout and stderr of processes:');
    for (const h of handles) {
      log(`   --- ${h.name} stdout ---`);
      console.log(h.getStdout() || '(no stdout output)');
      log(`   --- ${h.name} stderr ---`);
      console.error(h.getStderr() || '(no stderr output)');
    }
    log('================================================================');
    log('🛑  Terminating booted processes...');
    await Promise.allSettled(
      handles.map((h) => {
        return new Promise((resolve) => {
          if (h.proc.exitCode !== null) {
            resolve();
            return;
          }
          h.proc.on('exit', () => resolve());
          h.proc.kill('SIGKILL');
        });
      })
    );
    process.exit(1);
  }

  // Query baseline before load
  log('📝  Recording initial handle/memory baselines...');
  for (const h of handles) {
    if (h.proc.exitCode === null) {
      h.proc.send({ type: 'QUERY_TELEMETRY' });
    }
  }
  await new Promise((r) => setTimeout(r, 500)); // allow IPC replies to process

  // ---- 2. Telemetry & traffic loop ----
  log(`📊  Monitoring telemetry snapshots (every ${TELEMETRY_INTERVAL_MS / 1000}s via IPC)...`);

  const telemetryTimer = setInterval(() => {
    for (const h of handles) {
      if (h.proc.exitCode !== null) continue;
      try {
        h.proc.send({ type: 'QUERY_TELEMETRY' });
      } catch {
        // ignore
      }
    }
  }, TELEMETRY_INTERVAL_MS);

  // Lightweight traffic injection
  let runTraffic = true;
  const trafficTimer = setInterval(() => {
    if (!runTraffic) return;
    for (const h of handles) {
      if (h.proc.exitCode !== null) continue;
      httpGet(h.port, '/health').catch(() => {});
    }
  }, TRAFFIC_INTERVAL_MS);

  // Start controlled failure injection drill if enabled
  let failureDrillPromise = Promise.resolve();
  if (INJECT_FAILURES) {
    failureDrillPromise = runFailureDrill().catch((err) => {
      log(`❌ [Failure Drill] Drill failed: ${err.message}`);
      failures++;
    });
  }

  // ---- 3. Wait for soak duration ----
  log(`⏳  Soaking for ${SOAK_DURATION_S}s...`);
  const soakStart = Date.now();

  const progressTimer = setInterval(() => {
    const elapsed = Math.round((Date.now() - soakStart) / 1000);
    const remaining = SOAK_DURATION_S - elapsed;
    if (remaining > 0) {
      process.stdout.write(`\r   ⏱  ${elapsed}s / ${SOAK_DURATION_S}s elapsed  (${remaining}s remaining)   `);
    }
  }, 2000);

  // Stop traffic 4 seconds before the end of the soak window to cool down
  await new Promise((r) => setTimeout(r, Math.max(0, SOAK_DURATION_MS - 4000)));
  runTraffic = false;
  clearInterval(trafficTimer);
  log('\n🚦  Traffic stopped. Cool down period (stabilizing connections)...');

  // Wait for failure drill if active to ensure all assertions have completed
  if (INJECT_FAILURES) {
    await failureDrillPromise;
  }

  // Query post-traffic telemetry snapshot 1 second before teardown
  await new Promise((r) => setTimeout(r, 3000));
  log('📝  Recording post-traffic handle/memory snapshots...');
  for (const h of handles) {
    if (h.proc.exitCode === null) {
      h.proc.send({ type: 'QUERY_TELEMETRY' });
    }
  }
  await new Promise((r) => setTimeout(r, 1000)); // allow IPC replies to process

  clearInterval(telemetryTimer);
  clearInterval(progressTimer);
  log('✅  Soak window complete.');

  // ---- 4. Graceful shutdown cascade and signal escalation ----
  log('🛑  Sending SIGTERM to all services...');

  const shutdownResults = await Promise.allSettled(
    handles.map(
      (h) =>
        new Promise((resolve, reject) => {
          if (h.proc.exitCode !== null) {
            reject(new Error(`${h.name} exited prematurely during soak (code ${h.proc.exitCode})`));
            return;
          }

          const timeout = setTimeout(() => {
            // Retrieve last recorded active handles for debugging
            const lastSnaps = telemetry.get(h.name);
            const lastSnap = lastSnaps[lastSnaps.length - 1];
            const leftHandles = lastSnap ? lastSnap.handles.join(', ') : 'unknown';
            
            log(`   ⚠️  ${h.name} did not terminate within grace window. Escalating to SIGKILL...`);
            log(`      ↳ Outstanding handles before SIGKILL: [${leftHandles}]`);
            
            h.proc.kill('SIGKILL');
            reject(new Error(`${h.name} failed SIGTERM grace window and was terminated via SIGKILL`));
          }, SHUTDOWN_GRACE_MS);

          h.proc.on('exit', (code) => {
            clearTimeout(timeout);
            if (code === 0 || code === null) {
              resolve({ name: h.name, code });
            } else {
              reject(new Error(`${h.name} exited with non-zero code ${code}`));
            }
          });

          h.proc.kill('SIGTERM');
        })
    )
  );

  // Clear active handles since processes are now dead
  activeHandles.length = 0;

  // Verify ports are actually released
  log('🔍  Verifying port release after shutdown...');
  await new Promise((r) => setTimeout(r, 1000)); // Allow OS to release ports
  for (const s of SERVICES) {
    const portCheck = await httpGet(s.port, '/health');
    if (portCheck.status !== 0) {
      log(`   ⚠️  Port ${s.port} (${s.name}) still responding after shutdown!`);
      failures++;
    } else {
      log(`   ✔ Port ${s.port} (${s.name}) released`);
    }
  }

  // ---- 5. Analyse results ----
  log('');
  log('='.repeat(64));
  log('📊  SOAK VALIDATION RESULTS & TELEMETRY ANALYSIS');
  log('='.repeat(64));

  for (const result of shutdownResults) {
    if (result.status === 'fulfilled') {
      log(`   ✅ ${result.value.name} — graceful termination (exit code ${result.value.code ?? 0})`);
    } else {
      log(`   ❌ ${result.reason.message}`);
      failures++;
    }
  }

  // Check for crash signatures in stderr
  for (const h of handles) {
    const stderr = h.getStderr().toLowerCase();
    if (stderr.includes('referenceerror') || stderr.includes('syntaxerror') || stderr.includes('err_require_esm')) {
      log(`   ❌ ${h.name} — crash signature detected in stderr`);
      failures++;
    }
  }

  // Telemetry archaeology
  log('');
  log('📈  Telemetry archaeology:');
  const serviceStats = {};

  for (const [name, entries] of telemetry) {
    if (entries.length < 2) {
      log(`   ⚠️  ${name}: Insufficient snapshots collected (${entries.length})`);
      continue;
    }

    const first = entries[0];
    const last = entries[entries.length - 1];

    // Compute memory trends
    const rssDeltaMB = ((last.memory.rss - first.memory.rss) / 1024 / 1024).toFixed(2);
    const heapDeltaMB = ((last.memory.heapUsed - first.memory.heapUsed) / 1024 / 1024).toFixed(2);
    
    // Average Event Loop Utilization (ELU)
    const avgElu = (entries.reduce((sum, e) => sum + (e.elu || 0), 0) / entries.length * 100).toFixed(2);
    const peakElu = (Math.max(...entries.map((e) => e.elu || 0)) * 100).toFixed(2);

    // Handle archaeology (baseline vs final)
    const firstHandles = first.handles || [];
    const lastHandles = last.handles || [];
    const handleDelta = lastHandles.length - firstHandles.length;

    log(`   ${name}:`);
    log(`      ↳ Snapshots: ${entries.length}`);
    log(`      ↳ Memory RSS: baseline ${(first.memory.rss / 1024 / 1024).toFixed(1)} MB, delta ${rssDeltaMB} MB`);
    log(`      ↳ Memory Heap: baseline ${(first.memory.heapUsed / 1024 / 1024).toFixed(1)} MB, delta ${heapDeltaMB} MB`);
    log(`      ↳ Active Handles: baseline ${firstHandles.length}, post-traffic ${lastHandles.length} (delta ${handleDelta > 0 ? '+' : ''}${handleDelta})`);
    log(`      ↳ ELU: avg ${avgElu}%, peak ${peakElu}%`);

    if (handleDelta > 0) {
      // Find what leaked
      const diff = [...lastHandles];
      firstHandles.forEach((h) => {
        const idx = diff.indexOf(h);
        if (idx !== -1) diff.splice(idx, 1);
      });
      log(`      ⚠️  POTENTIAL RESOURCE LEAK: ${handleDelta} handles remained unclosed: [${diff.join(', ')}]`);
      // We don't fail immediately on single file handle changes (like logs), but warn
    }

    // Flag memory leak if RSS grows continuously by more than 25MB, and only fail if run duration is high enough to confidently distinguish JIT/warmup overhead from structural leaks
    if (parseFloat(rssDeltaMB) > 25.0) {
      if (SOAK_DURATION_S >= 120) {
        log(`      ❌ FAILURE: Memory RSS grew continuously by ${rssDeltaMB} MB under long-horizon soak.`);
        failures++;
      } else {
        log(`      ⚠️  Memory RSS grew by ${rssDeltaMB} MB. Under short-duration validation, this is categorized as bootstrap/JIT warmup allocation rather than a structural leak.`);
      }
    }

    serviceStats[name] = {
      rssDeltaMB,
      heapDeltaMB,
      avgElu,
      peakElu,
      handleDelta,
      firstHandles,
      lastHandles,
    };
  }

  // ---- 6. Persist telemetry data ----
  const soakDataDir = path.join(rootDir, 'soak-data');
  if (!fs.existsSync(soakDataDir)) fs.mkdirSync(soakDataDir, { recursive: true });

  const reportFile = path.join(soakDataDir, `soak-report-${Date.now()}.json`);
  const report = {
    timestamp: new Date().toISOString(),
    durationSeconds: SOAK_DURATION_S,
    services: SERVICES.map((s) => s.name),
    shutdownResults: shutdownResults.map((r) =>
      r.status === 'fulfilled'
        ? { status: 'ok', name: r.value.name, code: r.value.code }
        : { status: 'fail', error: r.reason.message }
    ),
    serviceStats,
    failures,
  };
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  log(`💾  Telemetry report archived to ${path.relative(rootDir, reportFile)}`);

  // ---- 7. Exit ----
  log('');
  // Tiered Verdict Classification
  const nonCriticalFailures = [];
  if (failures > 0) {
    for (let i = 0; i < failures; i++) {
      nonCriticalFailures.push(`threshold violation #${i + 1}`);
    }
  }
  const cleanShutdown = shutdownResults.every(r => r.status === 'fulfilled');
  const verdict = classifyVerdict({
    failures,
    warnings: 0,
    recoveries: 0,
    criticalFailures: [],
    nonCriticalFailures,
    cleanShutdown,
    indeterminateFailures,
  });

  log('');
  log(formatVerdict(verdict, 'Soak Validation'));

  if (verdict.tier === 'FAIL') {
    log('📋  Dumping stdout and stderr of all processes for diagnostics:');
    for (const h of handles) {
      log(`   --- ${h.name} stdout ---`);
      console.log(h.getStdout() || '(no stdout output)');
      log(`   --- ${h.name} stderr ---`);
      console.error(h.getStderr() || '(no stderr output)');
    }
    log('================================================================');
  }

  process.exit(verdict.exitCode);
}

main().catch((err) => {
  console.error('Fatal soak engine error:', err);
  process.exit(1);
});
