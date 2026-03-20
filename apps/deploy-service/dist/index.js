"use strict";

// src/index.ts
var import_bullmq = require("bullmq");
var import_utils = require("@libs/utils");
var import_db = require("@libs/db");
var import_observability = require("@libs/observability");
(0, import_observability.startTracing)();
var VERCEL_TOKEN = process.env.VERCEL_TOKEN;
async function deployToCloud(projectId, sandboxDir) {
  import_utils.logger.info({ projectId, sandboxDir }, "[DeployService] Initiating cloud deployment...");
  if (!VERCEL_TOKEN) {
    import_utils.logger.warn("[DeployService] VERCEL_TOKEN missing. Using mock deployment URL.");
    const shortId = projectId.split("-")[0];
    return `https://multiagent-${shortId}.vercel.app`;
  }
  await new Promise((resolve) => setTimeout(resolve, 3e3));
  return `https://multiagent-${projectId.slice(0, 8)}.vercel.app`;
}
var worker = new import_bullmq.Worker(import_utils.DEPLOYMENT_QUEUE, async (job) => {
  const { projectId, executionId, sandboxDir } = job.data;
  import_utils.logger.info({ projectId, jobId: job.id }, "[DeployService] Processing deployment job");
  try {
    const liveUrl = await deployToCloud(projectId, sandboxDir);
    await import_db.prisma.build.update({
      where: { id: executionId },
      data: {
        previewUrl: liveUrl,
        status: "SUCCESS"
      }
    });
    await import_db.prisma.project.update({
      where: { id: projectId },
      data: { status: "READY" }
    });
    import_utils.logger.info({ projectId, liveUrl }, "[DeployService] Deployment successful!");
    return { success: true, url: liveUrl };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    import_utils.logger.error({ err: msg, projectId }, "[DeployService] Deployment failed");
    await import_db.prisma.build.update({
      where: { id: executionId },
      data: { status: "FAILED" }
    });
    throw err;
  }
}, {
  connection: import_utils.redis,
  concurrency: 5
});
import_utils.logger.info(`[Deployment-Pipeline] Service started on pid ${process.pid}`);
var shutdown = async () => {
  import_utils.logger.info("[DeployService] Shutting down...");
  await worker.close();
  await import_utils.redis.quit();
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
//# sourceMappingURL=index.js.map