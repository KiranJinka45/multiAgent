"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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

// src/index.ts
var import_config = require("dotenv/config");
var import_observability = require("@packages/observability");
var import_bullmq = require("bullmq");
var import_server = require("@packages/utils/server");
var import_db = require("@packages/db");

// src/deployer.ts
var import_child_process = require("child_process");
var import_util = require("util");
var import_path = __toESM(require("path"));
var import_fs_extra = __toESM(require("fs-extra"));
var import_utils = require("@packages/utils");
var execAsync = (0, import_util.promisify)(import_child_process.exec);
var VercelDeployer = class {
  token;
  teamId;
  constructor() {
    this.token = process.env.VERCEL_TOKEN || "";
    this.teamId = process.env.VERCEL_TEAM_ID;
    if (!this.token) {
      import_utils.logger.warn("[VercelDeployer] VERCEL_TOKEN is not set. Deployment will fail.");
    }
  }
  async deploy(projectId, sandboxDir) {
    import_utils.logger.info({ projectId, sandboxDir }, "[VercelDeployer] Initiating Vercel deployment");
    const vercelConfigPath = import_path.default.join(sandboxDir, "vercel.json");
    if (!import_fs_extra.default.existsSync(vercelConfigPath)) {
      const defaultConfig = {
        version: 2,
        name: `multiagent-${projectId}`,
        rewrites: [{ "source": "/(.*)", "destination": "/" }]
      };
      await import_fs_extra.default.writeJson(vercelConfigPath, defaultConfig, { spaces: 2 });
    }
    try {
      let command = `npx vercel deploy "${sandboxDir}" --token ${this.token} --yes --prod`;
      if (this.teamId) {
        command += ` --scope ${this.teamId}`;
      }
      import_utils.logger.debug({ command: command.replace(this.token, "REDACTED") }, "[VercelDeployer] Running deploy command");
      const { stdout, stderr } = await execAsync(command);
      if (stderr && !stdout) {
        throw new Error(`Vercel CLI Error: ${stderr}`);
      }
      const url = stdout.trim();
      if (!url.startsWith("http")) {
        const lines = url.split("\n");
        const lastLine = lines[lines.length - 1].trim();
        if (lastLine.startsWith("https://")) return lastLine;
      }
      return url;
    } catch (err) {
      const error = err;
      import_utils.logger.error({ error: error.message, stderr: error.stderr }, "[VercelDeployer] Process error");
      throw new Error(`Deployment failed: ${error.message}`);
    }
  }
};

// src/index.ts
(0, import_observability.initTelemetry)("multiagent-deploy-service");
var worker = new import_bullmq.Worker(import_server.DEPLOYMENT_QUEUE, async (job) => {
  const { projectId, executionId, sandboxDir } = job.data;
  import_server.logger.info({ projectId, executionId }, "[DeployService] Starting deployment");
  try {
    await import_db.db.mission.update({
      where: { id: executionId },
      data: {
        status: "deploying",
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
    const deployer = new VercelDeployer();
    const url = await deployer.deploy(projectId, sandboxDir);
    import_server.logger.info({ projectId, executionId, url }, "[DeployService] Deployment successful");
    await import_db.db.mission.update({
      where: { id: executionId },
      data: {
        status: "complete",
        metadata: {
          ...(await import_db.db.mission.findUnique({ where: { id: executionId } }))?.metadata,
          url,
          deployedAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      }
    });
    return { url };
  } catch (err) {
    const error = err;
    import_server.logger.error({ projectId, executionId, error: error.message }, "[DeployService] Deployment failed");
    await import_server.ReliabilityMonitor.recordError({
      service: "deploy-service",
      error: error.message,
      stack: error.stack,
      executionId,
      context: { projectId, sandboxDir },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    await import_db.db.mission.update({
      where: { id: executionId },
      data: {
        status: "failed",
        metadata: {
          ...(await import_db.db.mission.findUnique({ where: { id: executionId } }))?.metadata,
          deploymentError: error.message
        }
      }
    });
    throw err;
  }
}, {
  connection: import_server.redis,
  concurrency: 2
});
worker.on("failed", (job, err) => {
  import_server.logger.error({ jobId: job?.id, error: err.message }, "[DeployService] Job failed permanently");
});
import_server.logger.info("[DeployService] Worker started, listening on DEPLOYMENT_QUEUE");
//# sourceMappingURL=index.js.map