import client from "prom-client";
import * as http from 'http';

export const register = new client.Registry();
client.collectDefaultMetrics({ register });

export const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request latency",
  labelNames: ["method", "route", "status"],
  buckets: [0.1, 0.5, 1, 2, 5],
});

export const workerJobDuration = new client.Histogram({
  name: "worker_job_duration_seconds",
  help: "Worker job processing latency",
  labelNames: ["queue", "job_name", "status"],
  buckets: [1, 5, 10, 30, 60],
});

register.registerMetric(httpRequestDuration);
register.registerMetric(workerJobDuration);

// Cache Metrics
export const cacheHitsTotal = new client.Counter({
  name: "cache_hits_total",
  help: "Total number of semantic cache hits",
  labelNames: ["layer"], // 'l1' or 'l2'
});

export const cacheMissesTotal = new client.Counter({
  name: "cache_misses_total",
  help: "Total number of semantic cache misses",
});

// Resilience / Recovery Metrics
export const missionRecoveryTotal = new client.Counter({
  name: "mission_recovery_total",
  help: "Total number of missions recovered by Auto-Healer",
  labelNames: ["strategy"], // 'retry', 'restart', 'dlq'
});

// --- Phase 7 Cost & SLA Metrics ---
export const aiTokenCostTotal = new client.Counter({
  name: 'ai_token_cost_total',
  help: 'Total estimated USD cost of AI tokens',
  labelNames: ['model', 'provider']
});

export const aiCacheSavingsTotal = new client.Counter({
  name: 'ai_cache_savings_total',
  help: 'Total estimated USD saved by cache hits',
  labelNames: ['level']
});

export const recoveryLatency = new client.Histogram({
  name: 'mission_recovery_latency_seconds',
  help: 'Time taken to recover a failed mission (MTTR)',
  buckets: [1, 5, 10, 30, 60, 120]
});

register.registerMetric(cacheHitsTotal);
register.registerMetric(cacheMissesTotal);
register.registerMetric(missionRecoveryTotal);
register.registerMetric(aiTokenCostTotal);
register.registerMetric(aiCacheSavingsTotal);
register.registerMetric(recoveryLatency);

export { client };

/**
 * Starts a standalone metrics server for scraping
 */
export function startMetricsServer(port: number = 9091) {
  const REQUIRE_AUTH = process.env.REQUIRE_AUTH_FOR_METRICS === 'true';
  const SERVICE_SECRET = process.env.SERVICE_SECRET || 'multiagent-internal-secret-change-me-in-prod';

  const server = http.createServer(async (req: http.IncomingMessage, res: http.ServerResponse) => {
    if (req.url === '/metrics') {
      // Zero Trust: Optional Token Check
      if (REQUIRE_AUTH) {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
          res.statusCode = 401;
          return res.end('Unauthorized');
        }
      }

      res.setHeader('Content-Type', register.contentType);
      res.end(await register.metrics());
    } else {
      res.statusCode = 404;
      res.end();
    }
  });

  server.listen(port, () => {
    console.log(`Metrics server listening on port ${port}`);
  });

  return server;
}
