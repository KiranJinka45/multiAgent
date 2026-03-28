// src/logger.ts
import pino from "pino";
var logger = pino({
  level: process.env.LOG_LEVEL || "info",
  base: {
    service: process.env.SERVICE_NAME || "unknown-service"
  },
  timestamp: pino.stdTimeFunctions.isoTime
});

// src/metrics.ts
import client from "prom-client";
import * as http from "http";
var register = new client.Registry();
client.collectDefaultMetrics({ register });
var httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request latency",
  labelNames: ["method", "route", "status"],
  buckets: [0.1, 0.5, 1, 2, 5]
});
var workerJobDuration = new client.Histogram({
  name: "worker_job_duration_seconds",
  help: "Worker job processing latency",
  labelNames: ["queue", "job_name", "status"],
  buckets: [1, 5, 10, 30, 60]
});
register.registerMetric(httpRequestDuration);
register.registerMetric(workerJobDuration);
function startMetricsServer(port = 9091) {
  const server = http.createServer(async (req, res) => {
    if (req.url === "/metrics") {
      res.setHeader("Content-Type", register.contentType);
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

// src/index.ts
var index_default = logger;
function getExecutionLogger(executionId) {
  return logger.child({ executionId });
}
export {
  client,
  index_default as default,
  getExecutionLogger,
  httpRequestDuration,
  logger,
  register,
  startMetricsServer,
  workerJobDuration
};
//# sourceMappingURL=index.mjs.map