// src/index.ts
import "dotenv/config";
import { initTelemetry } from "@packages/observability";
import { Worker } from "bullmq";
import {
  redis,
  DEPLOYMENT_QUEUE,
  logger as logger2,
  ReliabilityMonitor
} from "@packages/utils/server";
import { db as prisma } from "@packages/db";

// src/deployer.ts
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs-extra";
import { logger } from "@packages/utils";
var execAsync = promisify(exec);
var VercelDeployer = class {
  token;
  teamId;
  constructor() {
    this.token = process.env.VERCEL_TOKEN || "";
    this.teamId = process.env.VERCEL_TEAM_ID;
    if (!this.token) {
      logger.warn("[VercelDeployer] VERCEL_TOKEN is not set. Deployment will fail.");
    }
  }
  async deploy(projectId, sandboxDir) {
    logger.info({ projectId, sandboxDir }, "[VercelDeployer] Initiating Vercel deployment");
    const vercelConfigPath = path.join(sandboxDir, "vercel.json");
    if (!fs.existsSync(vercelConfigPath)) {
      const defaultConfig = {
        version: 2,
        name: `multiagent-${projectId}`,
        rewrites: [{ "source": "/(.*)", "destination": "/" }]
      };
      await fs.writeJson(vercelConfigPath, defaultConfig, { spaces: 2 });
    }
    try {
      let command = `npx vercel deploy "${sandboxDir}" --token ${this.token} --yes --prod`;
      if (this.teamId) {
        command += ` --scope ${this.teamId}`;
      }
      logger.debug({ command: command.replace(this.token, "REDACTED") }, "[VercelDeployer] Running deploy command");
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
      logger.error({ error: error.message, stderr: error.stderr }, "[VercelDeployer] Process error");
      throw new Error(`Deployment failed: ${error.message}`);
    }
  }
};

// src/index.ts
initTelemetry("multiagent-deploy-service");
var worker = new Worker(DEPLOYMENT_QUEUE, async (job) => {
  const { projectId, executionId, sandboxDir } = job.data;
  logger2.info({ projectId, executionId }, "[DeployService] Starting deployment");
  try {
    await prisma.mission.update({
      where: { id: executionId },
      data: {
        status: "deploying",
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
    const deployer = new VercelDeployer();
    const url = await deployer.deploy(projectId, sandboxDir);
    logger2.info({ projectId, executionId, url }, "[DeployService] Deployment successful");
    await prisma.mission.update({
      where: { id: executionId },
      data: {
        status: "complete",
        metadata: {
          ...(await prisma.mission.findUnique({ where: { id: executionId } }))?.metadata,
          url,
          deployedAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      }
    });
    return { url };
  } catch (err) {
    const error = err;
    logger2.error({ projectId, executionId, error: error.message }, "[DeployService] Deployment failed");
    await ReliabilityMonitor.recordError({
      service: "deploy-service",
      error: error.message,
      stack: error.stack,
      executionId,
      context: { projectId, sandboxDir },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    await prisma.mission.update({
      where: { id: executionId },
      data: {
        status: "failed",
        metadata: {
          ...(await prisma.mission.findUnique({ where: { id: executionId } }))?.metadata,
          deploymentError: error.message
        }
      }
    });
    throw err;
  }
}, {
  connection: redis,
  concurrency: 2
});
worker.on("failed", (job, err) => {
  logger2.error({ jobId: job?.id, error: err.message }, "[DeployService] Job failed permanently");
});
logger2.info("[DeployService] Worker started, listening on DEPLOYMENT_QUEUE");
//# sourceMappingURL=index.mjs.map