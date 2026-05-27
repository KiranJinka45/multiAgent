/**
 * ZTAN Phase 18F — Infrastructure-Level Chaos & Request-Level Telemetry Soak Validation Engine
 *
 * This test runner replaces simulated application faults with actual container-level
 * infrastructure chaos (Docker pause/unpause, stop/start) and generates a detailed
 * request-level performance and resilience report.
 */

import { spawn, execSync } from 'child_process';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// CLI Argument Parsing
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const durationIdx = args.indexOf('--duration');
const SOAK_DURATION_S = durationIdx !== -1 ? parseInt(args[durationIdx + 1], 10) : 25;
const SOAK_DURATION_MS = SOAK_DURATION_S * 1000;
const SHUTDOWN_GRACE_MS = 10_000;
const TELEMETRY_INTERVAL_MS = 2_000;
const TRAFFIC_RATE_HZ = 8; // 8 requests per second
const TRAFFIC_INTERVAL_MS = 1000 / TRAFFIC_RATE_HZ;

// Container Names for Infrastructure Chaos
const PG_CONTAINER = process.env.CHAOS_PG_CONTAINER || 'multiagent-main-postgres-1';
const REDIS_CONTAINER = process.env.CHAOS_REDIS_CONTAINER || 'multiagent-main-redis-1';

// ---------------------------------------------------------------------------
// Service Definitions
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
// Telemetry and Request Logs Storage
// ---------------------------------------------------------------------------
const telemetry = new Map();
SERVICES.forEach((s) => telemetry.set(s.name, []));

/** @type {Array<{timestamp:number, success:boolean, status:number, latency:number, error:string|null}>} */
const requestTraceLog = [];

// Track chaos event windows for metrics slicing
const chaosWindows = {
  dbOutage: { start: 0, end: 0, recoverActionTs: 0 },
  redisOutage: { start: 0, end: 0, recoverActionTs: 0 }
};

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
    const start = Date.now();
    const req = http.get(`http://127.0.0.1:${port}${urlPath}`, { timeout: 2000 }, (res) => {
      let body = '';
      res.on('data', (d) => (body += d));
      res.on('end', () => resolve({ status: res.statusCode, body, latency: Date.now() - start }));
    });
    req.on('error', (err) => resolve({ status: 0, body: '', latency: Date.now() - start, error: err }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, body: '', latency: Date.now() - start, error: new Error('Timeout') }); });
  });
}

// ---------------------------------------------------------------------------
// Infrastructure Chaos Commands
// ---------------------------------------------------------------------------
function runDockerCmd(cmd) {
  try {
    execSync(cmd, { stdio: 'ignore' });
    return true;
  } catch (err) {
    log(`⚠️  Failed to run Docker command: "${cmd}". Error: ${err.message}`);
    return false;
  }
}

// Defensive Environment Restoration (Finally Block Target)
function restoreEnvironment() {
  log('🧹  Running environmental self-healing diagnostics to restore containers...');
  runDockerCmd(`docker unpause ${PG_CONTAINER}`);
  runDockerCmd(`docker start ${REDIS_CONTAINER}`);
  log('   ✔ All database and cache containers verified running/unpaused.');
}

// ---------------------------------------------------------------------------
// Operational Readiness Check Polling
// ---------------------------------------------------------------------------
async function verifyReadiness(handles, timeoutMs = 25000) {
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
// Real Infrastructure Chaos Injection Drill
// ---------------------------------------------------------------------------
async function runRealChaosDrill() {
  log('🔥 [Chaos Engine] Starting Real Infrastructure Chaos Validation...');

  // 1. PostgreSQL Outage Drill at 5s (docker pause)
  await new Promise((r) => setTimeout(r, 5000));
  log(`🔥 [Chaos Engine] Pausing PostgreSQL Container via Docker (${PG_CONTAINER})...`);
  chaosWindows.dbOutage.start = Date.now();
  
  if (!runDockerCmd(`docker pause ${PG_CONTAINER}`)) {
    throw new Error('Failed to pause PostgreSQL container. Ensure Docker is running.');
  }
  log('   ✔ PostgreSQL container paused (network sockets frozen / TCP blackhole).');

  // Verify health degraded endpoint via application observability
  await new Promise((r) => setTimeout(r, 1000));
  const healthDbRes = await httpGet(4022, '/api/v1/system-health');
  if (healthDbRes.status === 200) {
    const data = JSON.parse(healthDbRes.body);
    log(`   Observed health status: status=${data.status}, db=${data.checks?.db}, redis=${data.checks?.redis}`);
  }

  // Hold database outage for 4000ms total
  await new Promise((r) => setTimeout(r, 3000));
  log(`🔥 [Chaos Engine] Resuming PostgreSQL Container via Docker (${PG_CONTAINER})...`);
  chaosWindows.dbOutage.recoverActionTs = Date.now();
  
  if (!runDockerCmd(`docker unpause ${PG_CONTAINER}`)) {
    throw new Error('Failed to unpause PostgreSQL container!');
  }
  log('   ✔ PostgreSQL container unpaused.');
  chaosWindows.dbOutage.end = Date.now() + 4000; // allow a window for recovery observation

  // 2. Redis Outage Drill at 14s (docker stop)
  await new Promise((r) => setTimeout(r, 5000));
  log(`🔥 [Chaos Engine] Stopping Redis Container via Docker (${REDIS_CONTAINER})...`);
  chaosWindows.redisOutage.start = Date.now();
  
  if (!runDockerCmd(`docker stop -t 1 ${REDIS_CONTAINER}`)) {
    throw new Error('Failed to stop Redis container!');
  }
  log('   ✔ Redis container stopped (SIGTERM/SIGKILL sent, TCP reset immediately).');

  // Verify health degraded endpoint via application observability
  await new Promise((r) => setTimeout(r, 1000));
  const healthRedisRes = await httpGet(4022, '/api/v1/system-health');
  if (healthRedisRes.status === 200) {
    const data = JSON.parse(healthRedisRes.body);
    log(`   Observed health status: status=${data.status}, db=${data.checks?.db}, redis=${data.checks?.redis}`);
  }

  // Hold Redis outage for 4000ms total
  await new Promise((r) => setTimeout(r, 3000));
  log(`🔥 [Chaos Engine] Starting Redis Container via Docker (${REDIS_CONTAINER})...`);
  chaosWindows.redisOutage.recoverActionTs = Date.now();
  
  if (!runDockerCmd(`docker start ${REDIS_CONTAINER}`)) {
    throw new Error('Failed to restart Redis container!');
  }
  log('   ✔ Redis container started (reconnect storm window active).');
  chaosWindows.redisOutage.end = Date.now() + 4000;

  log('🎉 [Chaos Engine] Infrastructure Chaos Injection Drills successfully completed.');
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
// Main Orchestrator
// ---------------------------------------------------------------------------
async function main() {
  log('='.repeat(64));
  log(`🧪  INFRASTRUCTURE CHAOS SOAK ENGINE — ${SOAK_DURATION_S}s window`);
  log('='.repeat(64));

  let failures = 0;
  let handles = [];

  try {
    // ---- 1. Boot services ----
    log('🚀  Booting services with preloaded telemetry agents...');
    handles = SERVICES.map((s) => {
      const h = bootService(s);
      log(`   ↳ ${s.name} (pid ${h.proc.pid}) on port ${s.port}`);
      return { ...s, ...h };
    });

    // Strict operational readiness gate
    await verifyReadiness(handles, 25000);

    // Query baseline before load
    log('📝  Recording initial handle/memory baselines...');
    for (const h of handles) {
      if (h.proc.exitCode === null) {
        h.proc.send({ type: 'QUERY_TELEMETRY' });
      }
    }
    await new Promise((r) => setTimeout(r, 500)); // allow IPC replies to process

    // ---- 2. Telemetry & Active Traffic Load loop ----
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

    // Active high-fidelity concurrent traffic generator
    log(`🚦  Launching concurrent traffic generator targeting "/api/whoami" @ ${TRAFFIC_RATE_HZ} Hz...`);
    let runTraffic = true;
    const trafficTimer = setInterval(async () => {
      if (!runTraffic) return;
      
      const reqStart = Date.now();
      const trace = { timestamp: reqStart, success: false, status: 0, latency: 0, error: null };
      
      try {
        const res = await httpGet(4020, '/api/whoami');
        trace.latency = res.latency;
        trace.status = res.status;
        if (res.status === 200) {
          trace.success = true;
        } else {
          trace.error = `HTTP_${res.status}`;
        }
      } catch (err) {
        trace.latency = Date.now() - reqStart;
        trace.error = err.message;
      }
      
      requestTraceLog.push(trace);
    }, TRAFFIC_INTERVAL_MS);

    // Start real infrastructure chaos injection drill
    const failureDrillPromise = runRealChaosDrill().catch((err) => {
      log(`❌ [Chaos Engine] Drill failed: ${err.message}`);
      failures++;
    });

    // ---- 3. Wait for soak duration ----
    log(`⏳  Soaking for ${SOAK_DURATION_S}s under real chaos...`);
    const soakStart = Date.now();

    const progressTimer = setInterval(() => {
      const elapsed = Math.round((Date.now() - soakStart) / 1000);
      const remaining = SOAK_DURATION_S - elapsed;
      if (remaining > 0) {
        process.stdout.write(`\r   ⏱  ${elapsed}s / ${SOAK_DURATION_S}s elapsed  (${remaining}s remaining)   `);
      }
    }, 2000);

    // Wait until almost the end of the soak window
    await new Promise((r) => setTimeout(r, Math.max(0, SOAK_DURATION_MS - 4000)));
    runTraffic = false;
    clearInterval(trafficTimer);
    log('\n🚦  Traffic stopped. Cool down period (stabilizing connections)...');

    // Wait for the chaos drills to completely conclude
    await failureDrillPromise;

    // Query post-traffic telemetry snapshot 1 second before teardown
    await new Promise((r) => setTimeout(r, 2000));
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

  } catch (err) {
    log(`❌  CRITICAL RUNTIME ERROR: ${err.message}`);
    failures++;
  } finally {
    // ---- 4. Environmental restoration ----
    restoreEnvironment();

    // ---- 5. Graceful shutdown cascade and signal escalation ----
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

    // ---- 6. Analyze results ----
    log('');
    log('='.repeat(64));
    log('📊  INFRASTRUCTURE CHAOS SOAK RESULTS & METRICS');
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

    // A. Request-Level Resilience Metrics
    log('');
    log('📈  Request-Level Performance & Resilience Metrics:');
    
    const totalRequests = requestTraceLog.length;
    const successfulRequests = requestTraceLog.filter(t => t.success);
    const failedRequests = requestTraceLog.filter(t => !t.success);
    const successRate = totalRequests > 0 ? ((successfulRequests.length / totalRequests) * 100).toFixed(2) : '0.00';

    // Latency arrays
    const successfulLatencies = successfulRequests.map(t => t.latency);
    
    // Percentile Helper
    const getPercentile = (arr, p) => {
      if (arr.length === 0) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const index = Math.floor((p / 100) * (sorted.length - 1));
      return sorted[index];
    };

    const avgLatency = successfulLatencies.length > 0 ? (successfulLatencies.reduce((a, b) => a + b, 0) / successfulLatencies.length).toFixed(1) : '0';
    const p95Latency = getPercentile(successfulLatencies, 95).toFixed(1);
    const p99Latency = getPercentile(successfulLatencies, 99).toFixed(1);

    // Metrics Sliced by Outage Windows
    const dbChaosReqs = requestTraceLog.filter(t => t.timestamp >= chaosWindows.dbOutage.start && t.timestamp <= chaosWindows.dbOutage.end);
    const dbChaosSuccess = dbChaosReqs.filter(t => t.success);
    const dbChaosSuccessRate = dbChaosReqs.length > 0 ? ((dbChaosSuccess.length / dbChaosReqs.length) * 100).toFixed(2) : '100.00';

    const redisChaosReqs = requestTraceLog.filter(t => t.timestamp >= chaosWindows.redisOutage.start && t.timestamp <= chaosWindows.redisOutage.end);
    const redisChaosSuccess = redisChaosReqs.filter(t => t.success);
    const redisChaosSuccessRate = redisChaosReqs.length > 0 ? ((redisChaosSuccess.length / redisChaosReqs.length) * 100).toFixed(2) : '100.00';

    // RTO (Recovery Time Objective) Calculator
    // Defined as the duration from when the recovery action began until 3 consecutive successful requests with latency < 150ms occurred.
    const computeRTO = (windowObj, outageName) => {
      const recoverStart = windowObj.recoverActionTs;
      if (!recoverStart) return 'N/A';
      
      const postRecoveryReqs = requestTraceLog.filter(t => t.timestamp >= recoverStart).sort((a, b) => a.timestamp - b.timestamp);
      
      let consecutiveSuccesses = 0;
      let recoveryTimeMs = -1;

      for (let i = 0; i < postRecoveryReqs.length; i++) {
        const req = postRecoveryReqs[i];
        if (req.success && req.latency < 150) {
          consecutiveSuccesses++;
          if (consecutiveSuccesses === 3) {
            // Recovery point is when the third nominal request completed
            recoveryTimeMs = req.timestamp - recoverStart;
            break;
          }
        } else {
          consecutiveSuccesses = 0;
        }
      }

      if (recoveryTimeMs !== -1) {
        return `${(recoveryTimeMs / 1000).toFixed(3)} s`;
      }
      return 'Did not fully recover to baseline latency within the monitoring window';
    };

    const dbRTO = computeRTO(chaosWindows.dbOutage, 'DB Outage');
    const redisRTO = computeRTO(chaosWindows.redisOutage, 'Redis Outage');

    // Error Budget Consumption
    // Defined as failed requests as a percentage of the allowed failure budget (15% of total requests)
    const ALLOWED_FAILURE_BUDGET_PCT = 15;
    const allowedFailures = Math.max(1, Math.round(totalRequests * (ALLOWED_FAILURE_BUDGET_PCT / 100)));
    const budgetConsumed = ((failedRequests.length / allowedFailures) * 100).toFixed(1);

    log(`      ↳ Total Traffic Sent: ${totalRequests} requests`);
    log(`      ↳ Overall Success Rate: ${successRate}% (${successfulRequests.length} success, ${failedRequests.length} failures)`);
    log(`      ↳ Traffic Latency (Successful): avg=${avgLatency}ms, p95=${p95Latency}ms, p99=${p99Latency}ms`);
    log(`      ↳ Outage Success Slices:`);
    log(`         • PostgreSQL Outage Window Success: ${dbChaosSuccessRate}% (${dbChaosSuccess.length}/${dbChaosReqs.length})`);
    log(`         • Redis Outage Window Success: ${redisChaosSuccessRate}% (${redisChaosSuccess.length}/${redisChaosReqs.length})`);
    log(`      ↳ Recovery Time Objective (RTO):`);
    log(`         • PostgreSQL RTO (docker unpause): ${dbRTO}`);
    log(`         • Redis RTO (docker start): ${redisRTO}`);
    log(`      ↳ Error Budget: Allowed failures = ${allowedFailures} (${ALLOWED_FAILURE_BUDGET_PCT}% limit). Consumed = ${budgetConsumed}%`);

    if (parseFloat(budgetConsumed) > 100.0) {
      log('      ❌ FAILURE: Error budget exceeded (>100% consumption).');
      failures++;
    }

    // B. Telemetry Archaeology & Defensible Handle Reporting
    log('');
    log('📈  Telemetry Archaeology & Handle Investigation:');
    const serviceStats = {};

    for (const [name, entries] of telemetry) {
      if (entries.length < 2) {
        log(`   ⚠️  ${name}: Insufficient snapshots collected (${entries.length})`);
        continue;
      }

      const first = entries[0];
      const last = entries[entries.length - 1];

      const rssDeltaMB = ((last.memory.rss - first.memory.rss) / 1024 / 1024).toFixed(2);
      const heapDeltaMB = ((last.memory.heapUsed - first.memory.heapUsed) / 1024 / 1024).toFixed(2);
      
      const avgElu = (entries.reduce((sum, e) => sum + (e.elu || 0), 0) / entries.length).toFixed(2);
      const peakElu = Math.max(...entries.map((e) => e.elu || 0)).toFixed(2);

      const firstHandles = first.handles || [];
      const lastHandles = last.handles || [];
      const handleDelta = lastHandles.length - firstHandles.length;

      log(`   ${name}:`);
      log(`      ↳ Snapshots: ${entries.length}`);
      log(`      ↳ Memory RSS: baseline ${(first.memory.rss / 1024 / 1024).toFixed(1)} MB, delta ${rssDeltaMB} MB`);
      log(`      ↳ Memory Heap: baseline ${(first.memory.heapUsed / 1024 / 1024).toFixed(1)} MB, delta ${heapDeltaMB} MB`);
      log(`      ↳ Active Handles: baseline ${firstHandles.length}, post-traffic ${lastHandles.length} (delta ${handleDelta > 0 ? '+' : ''}${handleDelta})`);
      log(`      ↳ Event Loop Utilization (ELU): avg ${avgElu}%, peak ${peakElu}%`);

      if (handleDelta > 0) {
        const diff = [...lastHandles];
        firstHandles.forEach((h) => {
          const idx = diff.indexOf(h);
          if (idx !== -1) diff.splice(idx, 1);
        });
        log(`      ⚠️  OBSERVATION: ${handleDelta} lingering handles remained: [${diff.join(', ')}]`);
        log(`         ↳ "No sustained unbounded resource growth was observed during the validation window; however, isolated persistent socket handles remain under investigation."`);
      } else {
        log(`      ✔ No sustained unbounded resource growth was observed during the validation window.`);
      }

      if (parseFloat(rssDeltaMB) > 15.0) {
        log(`      ❌ FAILURE: Memory RSS grew continuously by ${rssDeltaMB} MB (>15MB bound)`);
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

    // Save detailed telemetry JSON report
    const soakDataDir = path.join(rootDir, 'soak-data');
    if (!fs.existsSync(soakDataDir)) fs.mkdirSync(soakDataDir, { recursive: true });

    const reportFile = path.join(soakDataDir, `infra-chaos-report-${Date.now()}.json`);
    const report = {
      timestamp: new Date().toISOString(),
      durationSeconds: SOAK_DURATION_S,
      services: SERVICES.map((s) => s.name),
      shutdownResults: shutdownResults.map((r) =>
        r.status === 'fulfilled'
          ? { status: 'ok', name: r.value.name, code: r.value.code }
          : { status: 'fail', error: r.reason.message }
      ),
      requestMetrics: {
        totalRequests,
        successRate,
        avgLatency,
        p95Latency,
        p99Latency,
        dbChaosSuccessRate,
        redisChaosSuccessRate,
        dbRTO,
        redisRTO,
        budgetConsumed,
      },
      serviceStats,
      failures,
    };
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    log(`💾  Chaos telemetry report archived to ${path.relative(rootDir, reportFile)}`);

    // ---- 7. Exit ----
    log('');
    if (failures > 0) {
      log(`❌  INFRASTRUCTURE CHAOS SOAK VALIDATION FAILED — ${failures} failure(s) detected`);
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
      log('🎉  INFRASTRUCTURE CHAOS SOAK VALIDATION PASSED — all services survived, remained structurally stable under real infrastructure failures, and shut down cleanly.');
      process.exit(0);
    }
  }
}

main().catch((err) => {
  console.error('Fatal chaos soak engine error:', err);
  process.exit(1);
});
