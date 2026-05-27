import { performance, PerformanceObserver } from 'perf_hooks';
import v8 from 'v8';

if (typeof process.send === 'function') {
  let lastElu = performance.eventLoopUtilization();

  let gcMinorCount = 0;
  let gcMajorCount = 0;
  let gcOtherCount = 0;
  let totalGcTime = 0;
  let gcPausesInInterval = [];

  try {
    const obs = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      for (const entry of entries) {
        gcPausesInInterval.push(entry.duration);
        totalGcTime += entry.duration;
        // Node.js GC type detail (1 = Scavenge/Minor, 2 = Mark-Sweep-Compact/Major, 4 = Incremental, 8 = WeakCallback)
        const kind = entry.detail ? entry.detail.kind : (entry.kind || 0);
        if (kind === 1 || kind === 4) {
          gcMinorCount++;
        } else if (kind === 2 || kind === 8) {
          gcMajorCount++; // Major GC / compaction
        } else {
          gcOtherCount++;
        }
      }
    });
    obs.observe({ entryTypes: ['gc'] });
  } catch (e) {
    // Graceful fallback if performance observer is not supported or restricted
  }

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

      // Query old space statistics
      let oldSpaceUsed = 0;
      let oldSpaceSize = 0;
      try {
        const heapSpaces = v8.getHeapSpaceStatistics();
        const oldSpace = heapSpaces.find((s) => s.space_name === 'old_space');
        if (oldSpace) {
          oldSpaceUsed = oldSpace.space_used_size;
          oldSpaceSize = oldSpace.space_size;
        }
      } catch {}

      const mem = process.memoryUsage();
      const heapStats = v8.getHeapStatistics();
      const fragmentation = heapStats.total_heap_size > 0 
        ? (1 - (heapStats.used_heap_size / heapStats.total_heap_size)) 
        : 0;

      // Extract and clear GC pauses for this interval
      const intervalPauses = [...gcPausesInInterval];
      gcPausesInInterval = [];

      process.send({
        type: 'TELEMETRY_REPORT',
        timestamp: Date.now(),
        memory: {
          rss: mem.rss,
          heapUsed: mem.heapUsed,
          heapTotal: mem.heapTotal,
          external: mem.external,
          heapStats: {
            total_heap_size: heapStats.total_heap_size,
            used_heap_size: heapStats.used_heap_size,
            heap_size_limit: heapStats.heap_size_limit,
            fragmentationRatio: fragmentation,
            malloced_memory: heapStats.malloced_memory || 0,
            peak_malloced_memory: heapStats.peak_malloced_memory || 0
          },
          oldSpaceUsed,
          oldSpaceSize
        },
        gc: {
          minorCount: gcMinorCount,
          majorCount: gcMajorCount, // Compactions
          otherCount: gcOtherCount,
          totalGcTime,
          pauses: intervalPauses
        },
        handles: activeHandles,
        requestsCount: activeRequestsCount,
        elu: deltaElu.utilization * 100, // as percentage
      });
    }
  });
}
