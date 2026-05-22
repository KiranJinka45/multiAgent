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

const args = process.argv.slice(2);
let pidArg: string | null = null;
let partitionArg = '0';
let lagThreshold = 2000; // 2 seconds max permitted loop lag
let staleThreshold = 3000; // 3 seconds max liveness file age

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--pid' && args[i + 1]) {
    pidArg = args[i + 1];
  } else if (args[i] === '--partition' && args[i + 1]) {
    partitionArg = args[i + 1];
  } else if (args[i] === '--lag' && args[i + 1]) {
    lagThreshold = parseInt(args[i + 1], 10);
  } else if (args[i] === '--stale' && args[i + 1]) {
    staleThreshold = parseInt(args[i + 1], 10);
  }
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

log(`Monitoring coordinator PID ${targetPid} for partition ${partition}...`);
log(`Thresholds: Max Loop Lag = ${lagThreshold}ms, Max Stale Age = ${staleThreshold}ms`);

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

  // 2. Read and verify liveness file
  if (!fs.existsSync(livenessFile)) {
    missedHeartbeats++;
    log(`Liveness file does not exist (missed count: ${missedHeartbeats}/${MAX_MISSED_HEARTBEATS})`);
    if (missedHeartbeats >= MAX_MISSED_HEARTBEATS) {
      const reason = `Stale authority. Liveness file missing for ${missedHeartbeats} consecutive checks.`;
      log(`CRITICAL: ${reason} Force killing target PID ${targetPid}...`);
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
      logTermination(targetPid, partition, reason);
      try {
        process.kill(targetPid, 'SIGKILL');
      } catch (e) {}
      clearInterval(monitorInterval);
      process.exit(0);
    }

    const fileAge = Date.now() - new Date(liveness.timestamp).getTime();
    const reportedLag = Number(liveness.eventLoopLagMs) || 0;

    // A. Check for file freshness
    if (fileAge > staleThreshold) {
      missedHeartbeats++;
      log(`Liveness file is stale: ${fileAge}ms old (missed count: ${missedHeartbeats}/${MAX_MISSED_HEARTBEATS})`);
      if (missedHeartbeats >= MAX_MISSED_HEARTBEATS) {
        const reason = `Event-loop starved or frozen. Liveness file stale for ${fileAge}ms.`;
        log(`CRITICAL: ${reason} Force killing target PID ${targetPid}...`);
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
    if (reportedLag > lagThreshold) {
      missedHeartbeats++;
      log(`High event-loop lag reported: ${reportedLag}ms (missed count: ${missedHeartbeats}/${MAX_MISSED_HEARTBEATS})`);
      if (missedHeartbeats >= MAX_MISSED_HEARTBEATS) {
        const reason = `Excessive event-loop starvation detected: ${reportedLag}ms lag.`;
        log(`CRITICAL: ${reason} Force killing target PID ${targetPid}...`);
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

