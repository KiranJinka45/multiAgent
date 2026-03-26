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

export { client };

/**
 * Starts a standalone metrics server for scraping
 */
export function startMetricsServer(port: number = 9091) {
  const server = http.createServer(async (req: http.IncomingMessage, res: http.ServerResponse) => {
    if (req.url === '/metrics') {
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
