"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  client: () => import_prom_client.default,
  default: () => index_default,
  getExecutionLogger: () => getExecutionLogger,
  httpRequestDuration: () => httpRequestDuration,
  logger: () => logger,
  register: () => register,
  startMetricsServer: () => startMetricsServer,
  workerJobDuration: () => workerJobDuration
});
module.exports = __toCommonJS(index_exports);

// src/logger.ts
var import_pino = __toESM(require("pino"));
var logger = (0, import_pino.default)({
  level: process.env.LOG_LEVEL || "info",
  base: {
    service: process.env.SERVICE_NAME || "unknown-service"
  },
  timestamp: import_pino.default.stdTimeFunctions.isoTime
});

// src/metrics.ts
var import_prom_client = __toESM(require("prom-client"));
var http = __toESM(require("http"));
var register = new import_prom_client.default.Registry();
import_prom_client.default.collectDefaultMetrics({ register });
var httpRequestDuration = new import_prom_client.default.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request latency",
  labelNames: ["method", "route", "status"],
  buckets: [0.1, 0.5, 1, 2, 5]
});
var workerJobDuration = new import_prom_client.default.Histogram({
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  client,
  getExecutionLogger,
  httpRequestDuration,
  logger,
  register,
  startMetricsServer,
  workerJobDuration
});
//# sourceMappingURL=index.js.map