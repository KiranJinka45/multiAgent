import * as fs from 'node:fs';
import * as path from 'node:path';

// Standalone out-of-process watchdog supervisor for Nexus ZTAN.
// Aggressively monitors coordinator processes and terminates them on loop lag or heartbeat starvation.

function log(msg: string) {
  const timestamp = new Date().toISOString();
  console.log(`[Watchdog Supervisor] [${timestamp}] ${msg}`);
}

function logTermination(pid: number, partition: number, reason: string) {
  const logDir = path.join(process.cwd(), '.ztan-transparency');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  const logPath = path.join(logDir, 'watchdog_events.log');
  const entry = `${new Date().toISOString()} | Target PID: ${pid} | Partition: ${partition} | TERMINATED | Reason: ${reason}\n`;
  fs.appendFileSync(logPath, entry, 'utf8');
}

function registerFailure(partition: number) {
  const suppressionFile = path.join(process.cwd(), '.ztan-transparency', 'watchdog_suppression.json');
  let data = { restarts: [] as { timestamp: number; partition: number }[] };
  try {
    if (fs.existsSync(suppressionFile)) {
      const raw = fs.readFileSync(suppressionFile, 'utf8');
      data = JSON.parse(raw);
    }
  } catch (e) {}

  const now = Date.now();
  data.restarts = data.restarts || [];
  data.restarts.push({ timestamp: now, partition });
  // Keep only last 60 seconds of restarts
  data.restarts = data.restarts.filter(r => now - r.timestamp < 60000);

  try {
    const dir = path.dirname(suppressionFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(suppressionFile, JSON.stringify(data, null, 2), 'utf8');
    log(`Registered failure for partition ${partition} in suppression tracker. Recent failures in last 60s: ${data.restarts.length}`);
  } catch (e: any) {
    log(`Failed to write suppression file: ${e.message || e}`);
  }
}

const args = process.argv.slice(2);
let pidArg: string | null = null;
let partitionArg = '0';
let lagThreshold = 2000; // 2 seconds max permitted loop lag
let staleThreshold = 3000; // 3 seconds max liveness file age
let profileArg = 'ci'; // environment profile: ci | staging | production
let warmupGrace = 10000; // 10 seconds startup grace window
const lagHistory: number[] = [];
const MAX_LAG_HISTORY = 60;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--pid' && args[i + 1]) {
    pidArg = args[i + 1];
  } else if (args[i] === '--partition' && args[i + 1]) {
    partitionArg = args[i + 1];
  } else if (args[i] === '--lag' && args[i + 1]) {
    lagThreshold = parseInt(args[i + 1], 10);
  } else if (args[i] === '--stale' && args[i + 1]) {
    staleThreshold = parseInt(args[i + 1], 10);
  } else if (args[i] === '--profile' && args[i + 1]) {
    profileArg = args[i + 1].toLowerCase();
  } else if (args[i] === '--warmup-grace' && args[i + 1]) {
    warmupGrace = parseInt(args[i + 1], 10);
  }
}

if (profileArg === 'ci' || profileArg === 'local') {
  lagThreshold = 2000;
  staleThreshold = 3000;
} else if (profileArg === 'staging') {
  lagThreshold = 5000;
  staleThreshold = 6000;
} else if (profileArg === 'production') {
  lagThreshold = 5000;
  staleThreshold = 7500;
}

if (!pidArg) {
  log('ERROR: Target coordinator --pid is required.');
  process.exit(1);
}

const targetPid = parseInt(pidArg, 10);
const partition = parseInt(partitionArg, 10);

if (isNaN(targetPid)) {
  log(`ERROR: Invalid target PID "${pidArg}"`);
  process.exit(1);
}

const supervisorStartTime = Date.now();

log(`Monitoring coordinator PID ${targetPid} for partition ${partition} under profile "${profileArg}"...`);
log(`Thresholds: Max Loop Lag = ${lagThreshold}ms, Max Stale Age = ${staleThreshold}ms, Warmup Grace = ${warmupGrace}ms`);

const livenessFile = partition === 0 
  ? path.join(process.cwd(), '.ztan-transparency', 'liveness.json')
  : path.join(process.cwd(), '.ztan-transparency', `liveness_partition_${partition}.json`);

let missedHeartbeats = 0;
const MAX_MISSED_HEARTBEATS = 3;

const monitorInterval = setInterval(() => {
  // 1. Check if target process is still alive
  let isAlive = false;
  try {
    process.kill(targetPid, 0);
    isAlive = true;
  } catch (err: any) {
    isAlive = false;
  }

  if (!isAlive) {
    log(`Target PID ${targetPid} has terminated or is unreachable. Watchdog exiting cleanly.`);
    clearInterval(monitorInterval);
    process.exit(0);
  }

  const elapsed = Date.now() - supervisorStartTime;
  const isWarmup = elapsed < warmupGrace;

  // Apply relaxed adaptive thresholds during warmup to prevent coordinated self-destruction
  const currentLagThreshold = isWarmup ? Math.max(lagThreshold * 3, 15000) : lagThreshold;
  const currentStaleThreshold = isWarmup ? Math.max(staleThreshold * 3, 20000) : staleThreshold;

  // 2. Read and verify liveness file
  if (!fs.existsSync(livenessFile)) {
    missedHeartbeats++;
    log(`Liveness file does not exist (missed count: ${missedHeartbeats}/${MAX_MISSED_HEARTBEATS})`);
    if (missedHeartbeats >= MAX_MISSED_HEARTBEATS) {
      const reason = `Stale authority. Liveness file missing for ${missedHeartbeats} consecutive checks.`;
      log(`CRITICAL: ${reason} Force killing target PID ${targetPid}...`);
      registerFailure(partition);
      logTermination(targetPid, partition, reason);
      try {
        process.kill(targetPid, 'SIGKILL');
      } catch (e: any) {
        log(`Failed to send SIGKILL to PID ${targetPid}: ${e.message || e}`);
      }
      clearInterval(monitorInterval);
      process.exit(0);
    }
    return;
  }

  try {
    const raw = fs.readFileSync(livenessFile, 'utf8');
    const liveness = JSON.parse(raw);
    
    // Assert target process attributes match the liveness file
    if (Number(liveness.pid) !== targetPid) {
      // Different process owns the liveness file now, which means targetPid is stale
      const reason = `Liveness file PID mismatch. Expected ${targetPid}, got ${liveness.pid}. Local process has lost authority!`;
      log(`CRITICAL: ${reason} Force killing target PID ${targetPid}...`);
      registerFailure(partition);
      logTermination(targetPid, partition, reason);
      try {
        process.kill(targetPid, 'SIGKILL');
      } catch (e) {}
      clearInterval(monitorInterval);
      process.exit(0);
    }

    const fileAge = Date.now() - new Date(liveness.timestamp).getTime();
    const reportedLag = Number(liveness.eventLoopLagMs) || 0;

    // In production, update dynamic lag history if liveness file is fresh
    if (profileArg === 'production' && fileAge < 10000) {
      lagHistory.push(reportedLag);
      if (lagHistory.length > MAX_LAG_HISTORY) {
        lagHistory.shift();
      }

      // Adaptively compute thresholds if we have enough samples
      if (lagHistory.length >= 15) {
        const sortedHistory = [...lagHistory].sort((a, b) => a - b);
        const index99 = Math.min(sortedHistory.length - 1, Math.round(sortedHistory.length * 0.99));
        const percentile99 = sortedHistory[index99];
        
        // Dynamically scale threshold: 2.5x 99th percentile with boundaries [5000, 15000]
        const nextLagThreshold = Math.min(15000, Math.max(5000, Math.round(percentile99 * 2.5)));
        const nextStaleThreshold = Math.round(nextLagThreshold * 1.5);
        
        if (Math.abs(nextLagThreshold - lagThreshold) > 500 || Math.abs(nextStaleThreshold - staleThreshold) > 500) {
          log(`Adapting dynamic production thresholds: Max Loop Lag = ${nextLagThreshold}ms, Max Stale Age = ${nextStaleThreshold}ms (99th Percentile Lag: ${percentile99}ms, Samples: ${lagHistory.length})`);
          lagThreshold = nextLagThreshold;
          staleThreshold = nextStaleThreshold;
        }
      }
    }

    // A. Check for file freshness
    if (fileAge > currentStaleThreshold) {
      missedHeartbeats++;
      log(`Liveness file is stale: ${fileAge}ms old (missed count: ${missedHeartbeats}/${MAX_MISSED_HEARTBEATS}, limit: ${currentStaleThreshold}ms${isWarmup ? ' [WARMUP]' : ''})`);
      if (missedHeartbeats >= MAX_MISSED_HEARTBEATS) {
        const reason = `Event-loop starved or frozen. Liveness file stale for ${fileAge}ms.`;
        log(`CRITICAL: ${reason} Force killing target PID ${targetPid}...`);
        registerFailure(partition);
        logTermination(targetPid, partition, reason);
        try {
          process.kill(targetPid, 'SIGKILL');
        } catch (e) {}
        clearInterval(monitorInterval);
        process.exit(0);
      }
      return;
    }

    // B. Check for high event-loop lag
    if (reportedLag > currentLagThreshold) {
      missedHeartbeats++;
      log(`High event-loop lag reported: ${reportedLag}ms (missed count: ${missedHeartbeats}/${MAX_MISSED_HEARTBEATS}, limit: ${currentLagThreshold}ms${isWarmup ? ' [WARMUP]' : ''})`);
      if (missedHeartbeats >= MAX_MISSED_HEARTBEATS) {
        const reason = `Excessive event-loop starvation detected: ${reportedLag}ms lag.`;
        log(`CRITICAL: ${reason} Force killing target PID ${targetPid}...`);
        registerFailure(partition);
        logTermination(targetPid, partition, reason);
        try {
          process.kill(targetPid, 'SIGKILL');
        } catch (e) {}
        clearInterval(monitorInterval);
        process.exit(0);
      }
      return;
    }

    // All checks passed in this tick
    missedHeartbeats = 0;

  } catch (err: any) {
    missedHeartbeats++;
    log(`Failed to parse liveness file: ${err.message || err} (missed count: ${missedHeartbeats}/${MAX_MISSED_HEARTBEATS})`);
    if (missedHeartbeats >= MAX_MISSED_HEARTBEATS) {
      const reason = `Corrupted or unreadable liveness file.`;
      log(`CRITICAL: ${reason} Force killing target PID ${targetPid}...`);
      registerFailure(partition);
      logTermination(targetPid, partition, reason);
      try {
        process.kill(targetPid, 'SIGKILL');
      } catch (e) {}
      clearInterval(monitorInterval);
      process.exit(0);
    }
  }
}, 1000);

// Standalone CLI supervisor stays active to monitor target coordinator

