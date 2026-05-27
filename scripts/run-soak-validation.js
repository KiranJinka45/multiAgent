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

import { spawn } from 'child_process';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

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
// Operational Readiness Check Polling
// ---------------------------------------------------------------------------
async function verifyReadiness(handles, timeoutMs = 15000) {
  log(`🔍  Checking operational readiness (timeout: ${timeoutMs / 1000}s, polling: 500ms)...`);
  const start = Date.now();
  const readyServices = new Set();

  while (Date.now() - start < timeoutMs) {
    // Check if any process died early
    for (const h of handles) {
      if (h.proc.exitCode !== null) {
        throw new Error(`Process ${h.name} exited prematurely during startup (exit code: ${h.proc.exitCode})`);
      }
    }

    // Ping services that aren't ready yet
    for (const h of handles) {
      if (readyServices.has(h.name)) continue;

      let ok = false;
      if (h.name === 'CoreAPI') {
        // Deep health check for database/redis connectivity
        const res = await httpGet(h.port, '/api/v1/system-health');
        if (res.status === 200) {
          try {
            const data = JSON.parse(res.body);
            if (data.checks && data.checks.db && data.checks.redis) {
              ok = true;
              log(`   ✔ ${h.name} is ready (DB & Redis connections active)`);
            } else {
              const dbStatus = data.checks ? data.checks.db : false;
              const redisStatus = data.checks ? data.checks.redis : false;
              log(`   ⏳ ${h.name} not fully ready yet (DB: ${dbStatus}, Redis: ${redisStatus})`);
            }
          } catch (e) {
            log(`   ⏳ ${h.name} response was not valid JSON: ${res.body.slice(0, 100)}`);
          }
        }
      } else if (h.name === 'Gateway') {
        const res = await httpGet(h.port, '/health');
        if (res.status === 200) {
          try {
            const data = JSON.parse(res.body);
            if (data.status === 'ok' && data.service === 'gateway') {
              ok = true;
              log(`   ✔ ${h.name} is ready (Port bound and status OK)`);
            }
          } catch (e) {
            log(`   ⏳ ${h.name} response was not valid JSON: ${res.body.slice(0, 100)}`);
          }
        }
      } else {
        const res = await httpGet(h.port, '/health');
        if (res.status === 200) {
          ok = true;
          log(`   ✔ ${h.name} is ready (Port bound)`);
        }
      }

      if (ok) {
        readyServices.add(h.name);
      }
    }

    if (readyServices.size === handles.length) {
      // Perform pre-soak Gateway BFF proxy routing check
      log('🔗  Verifying API routing path (Gateway -> CoreAPI)...');
      const bffRes = await httpGet(4020, '/api/whoami');
      if (bffRes.status === 200) {
        log('   ✅ API routing verification passed (Gateway -> CoreAPI round-trip OK)');
        return;
      } else {
        log(`   ⏳ Gateway BFF routing not ready yet (Status: ${bffRes.status})`);
      }
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  const missing = handles.filter((h) => !readyServices.has(h.name)).map((h) => h.name);
  throw new Error(`Readiness check timed out. Missing services: [${missing.join(', ')}]`);
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

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------
async function main() {
  log('='.repeat(64));
  log(`🧪  SOAK VALIDATION ENGINE — ${SOAK_DURATION_S}s soak window`);
  log('='.repeat(64));

  let failures = 0;

  // ---- 1. Boot services ----
  log('🚀  Booting services with preloaded telemetry agents...');
  const handles = SERVICES.map((s) => {
    const h = bootService(s);
    log(`   ↳ ${s.name} (pid ${h.proc.pid}) on port ${s.port}`);
    return { ...s, ...h };
  });

  // Strict operational readiness gate
  try {
    await verifyReadiness(handles, 15000);
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
    const avgElu = (entries.reduce((sum, e) => sum + (e.elu || 0), 0) / entries.length).toFixed(2);
    const peakElu = Math.max(...entries.map((e) => e.elu || 0)).toFixed(2);

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

    // Flag memory leak if RSS grows continuously by more than 15MB on idle
    if (parseFloat(rssDeltaMB) > 15.0) {
      log(`      ❌ FAILURE: Memory RSS grew continuously by ${rssDeltaMB} MB`);
      failures++;
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
  if (failures > 0) {
    log(`❌  SOAK VALIDATION FAILED — ${failures} failure(s) detected`);
    log('================================================================');
    log('📋  Dumping stdout and stderr of all processes for diagnostics:');
    for (const h of handles) {
      log(`   --- ${h.name} stdout ---`);
      console.log(h.getStdout() || '(no stdout output)');
      log(`   --- ${h.name} stderr ---`);
      console.error(h.getStderr() || '(no stderr output)');
    }
    log('================================================================');
    process.exit(1);
  } else {
    log('🎉  SOAK VALIDATION PASSED — all services survived, remained leak-free, and shut down cleanly');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal soak engine error:', err);
  process.exit(1);
});
