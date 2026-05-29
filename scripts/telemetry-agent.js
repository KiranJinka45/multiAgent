import { performance } from 'perf_hooks';
import crypto from 'crypto';
import os from 'os';
import fs from 'fs';

if (typeof process.send === 'function') {
  let lastElu = performance.eventLoopUtilization();
  let sequence = 0;
  let prevReportHash = 'ZTAN_TELEMETRY_GENESIS';

  // For event loop lag check
  let eventLoopLagMs = 0;
  const lagInterval = setInterval(() => {
    const start = performance.now();
    setImmediate(() => {
      eventLoopLagMs = performance.now() - start;
    });
  }, 100);

  // Unref interval to prevent it keeping the process alive
  lagInterval.unref();

  // Send immediate readiness handshake to parent process
  process.send({ type: 'TELEMETRY_READY', pid: process.pid, timestamp: Date.now() });

  process.on('message', (msg) => {
    if (msg && msg.type === 'QUERY_TELEMETRY') {
      const currentElu = performance.eventLoopUtilization();
      // Calculate delta ELU since last check
      const deltaElu = performance.eventLoopUtilization(currentElu, lastElu);
      lastElu = currentElu;

      let activeHandles = [];
      try {
        activeHandles = process._getActiveHandles().map((h) => {
          if (!h) return 'Unknown';
          const name = h.constructor ? h.constructor.name : 'Object';
          if (name === 'Socket') {
            return h.localPort
              ? `Socket(local:${h.localPort}, remote:${h.remoteAddress || 'none'}:${h.remotePort || ''})`
              : 'Socket(inactive)';
          }
          if (name === 'Server') {
            try {
              const addr = typeof h.address === 'function' ? h.address() : null;
              return `Server(port:${addr && addr.port ? addr.port : 'unknown'})`;
            } catch {
              return 'Server';
            }
          }
          if (name === 'Timeout') {
            return `Timeout(delay:${h._idleTimeout || 'unknown'})`;
          }
          return name;
        });
      } catch (e) {
        activeHandles = [`ErrorRetrievingHandles: ${e.message}`];
      }

      let activeRequestsCount = 0;
      try {
        const requests = process._getActiveRequests();
        activeRequestsCount = requests ? requests.length : 0;
      } catch {
        // ignore
      }

      const mem = process.memoryUsage();

      // --- Self-Verification logic ---
      const selfVerification = {
        schedulerLagMs: eventLoopLagMs,
        eluCorrelationOk: true,
        handlesConsistencyOk: true,
        memoryConsistencyOk: true
      };

      // 1. ELU vs Lag Correlation:
      // If event loop lag is extremely high but ELU is reported as extremely low (scheduler bias or reporting fraud)
      if (eventLoopLagMs > 300 && deltaElu.utilization < 0.01) {
        selfVerification.eluCorrelationOk = false;
      }

      // 2. Memory Cross-check:
      // Compare RSS against cgroup memory limits if present, otherwise total system memory
      let cgroupMemory = -1;
      try {
        if (os.platform() === 'linux') {
          if (fs.existsSync('/sys/fs/cgroup/memory/memory.usage_in_bytes')) {
            cgroupMemory = parseInt(fs.readFileSync('/sys/fs/cgroup/memory/memory.usage_in_bytes', 'utf8').trim(), 10);
          } else if (fs.existsSync('/sys/fs/cgroup/memory.current')) {
            cgroupMemory = parseInt(fs.readFileSync('/sys/fs/cgroup/memory.current', 'utf8').trim(), 10);
          }
        }
      } catch {}

      if (cgroupMemory > 0) {
        if (mem.rss > cgroupMemory * 1.5) {
          selfVerification.memoryConsistencyOk = false;
        }
      } else {
        if (mem.rss > os.totalmem()) {
          selfVerification.memoryConsistencyOk = false;
        }
      }

      // 3. Handles consistency:
      // If activeHandles is reported as empty but activeRequestsCount is positive (inconsistency)
      if (activeHandles.length === 0 && activeRequestsCount > 0) {
        selfVerification.handlesConsistencyOk = false;
      }

      const reportPayload = {
        type: 'TELEMETRY_REPORT',
        timestamp: Date.now(),
        sequence: sequence++,
        prevReportHash,
        memory: {
          rss: mem.rss,
          heapUsed: mem.heapUsed,
          heapTotal: mem.heapTotal,
          external: mem.external,
        },
        handles: activeHandles,
        requestsCount: activeRequestsCount,
        elu: deltaElu.utilization, // raw fraction [0, 1]
        selfVerification
      };

      // Cryptographic Chaining of payloads to prevent deletion/modification
      const serializedPayload = JSON.stringify({
        timestamp: reportPayload.timestamp,
        sequence: reportPayload.sequence,
        prevReportHash: reportPayload.prevReportHash,
        memory: reportPayload.memory,
        elu: reportPayload.elu,
        requestsCount: reportPayload.requestsCount,
        selfVerification
      });

      const reportHash = crypto.createHash('sha256').update(serializedPayload).digest('hex');
      reportPayload.reportHash = reportHash;

      // Update prevReportHash for the next report
      prevReportHash = reportHash;

      // Optional HMAC signing if campaign secret is provided
      const secret = process.env.ZTAN_TELEMETRY_SECRET;
      if (secret) {
        reportPayload.signature = crypto.createHmac('sha256', secret).update(reportHash).digest('hex');
      }

      process.send(reportPayload);
    }
  });
}
