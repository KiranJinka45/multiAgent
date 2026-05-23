import { performance } from 'perf_hooks';

if (typeof process.send === 'function') {
  let lastElu = performance.eventLoopUtilization();

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

      process.send({
        type: 'TELEMETRY_REPORT',
        timestamp: Date.now(),
        memory: {
          rss: mem.rss,
          heapUsed: mem.heapUsed,
          heapTotal: mem.heapTotal,
          external: mem.external,
        },
        handles: activeHandles,
        requestsCount: activeRequestsCount,
        elu: deltaElu.utilization * 100, // as percentage
      });
    }
  });
}
