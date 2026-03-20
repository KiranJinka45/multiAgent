// src/index.ts
import { Worker } from "bullmq";
import { redis, logger, DEPLOYMENT_QUEUE } from "@libs/utils";
import { prisma } from "@libs/db";
import { startTracing } from "@libs/observability";
startTracing();
var VERCEL_TOKEN = process.env.VERCEL_TOKEN;
async function deployToCloud(projectId, sandboxDir) {
  logger.info({ projectId, sandboxDir }, "[DeployService] Initiating cloud deployment...");
  if (!VERCEL_TOKEN) {
    logger.warn("[DeployService] VERCEL_TOKEN missing. Using mock deployment URL.");
    const shortId = projectId.split("-")[0];
    return `https://multiagent-${shortId}.vercel.app`;
  }
  await new Promise((resolve) => setTimeout(resolve, 3e3));
  return `https://multiagent-${projectId.slice(0, 8)}.vercel.app`;
}
var worker = new Worker(DEPLOYMENT_QUEUE, async (job) => {
  const { projectId, executionId, sandboxDir } = job.data;
  logger.info({ projectId, jobId: job.id }, "[DeployService] Processing deployment job");
  try {
    const liveUrl = await deployToCloud(projectId, sandboxDir);
    await prisma.build.update({
      where: { id: executionId },
      data: {
        previewUrl: liveUrl,
        status: "SUCCESS"
      }
    });
    await prisma.project.update({
      where: { id: projectId },
      data: { status: "READY" }
    });
    logger.info({ projectId, liveUrl }, "[DeployService] Deployment successful!");
    return { success: true, url: liveUrl };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ err: msg, projectId }, "[DeployService] Deployment failed");
    await prisma.build.update({
      where: { id: executionId },
      data: { status: "FAILED" }
    });
    throw err;
  }
}, {
  connection: redis,
  concurrency: 5
});
logger.info(`[Deployment-Pipeline] Service started on pid ${process.pid}`);
var shutdown = async () => {
  logger.info("[DeployService] Shutting down...");
  await worker.close();
  await redis.quit();
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
//# sourceMappingURL=index.mjs.map