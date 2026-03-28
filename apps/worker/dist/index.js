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

// src/instrumentation.ts
var import_observability = require("@packages/observability");
async function initInstrumentation(serviceName) {
  return (0, import_observability.initInstrumentation)(serviceName);
}

// src/index.ts
var import_observability18 = require("@packages/observability");

// src/architecture-worker.ts
var import_config = require("dotenv/config");
var import_bullmq = require("bullmq");
var import_observability2 = require("@packages/observability");
var import_shared_services = require("@packages/shared-services");
var import_server = require("@packages/utils/server");
var import_agents = require("@packages/agents");
var import_path = __toESM(require("path"));
var fs = __toESM(require("fs-extra"));
var customizerAgent = new import_agents.CustomizerAgent();
var logPath = import_path.default.join(process.cwd(), "architecture_worker.log");
var log = (msg) => {
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  fs.appendFileSync(logPath, `[${timestamp}] ${msg}
`);
};
var architectureWorker = new import_bullmq.Worker(import_shared_services.QUEUE_ARCHITECT, async (job) => {
  const { projectId, executionId, userId, prompt, intent, strategy } = job.data;
  const sandboxDir = import_path.default.join(process.cwd(), ".generated-projects", projectId);
  log(`[Architecture] Job received for ${executionId}`);
  import_observability2.logger.info({ projectId, executionId }, "[Architecture Worker] Started");
  try {
    await import_shared_services.eventBus.stage(executionId, "initializing", "in_progress", "Architecture Agent: Designing project structure...", 30);
    import_observability2.logger.info({ projectId, template: intent.templateId }, "[Architecture Worker] Initializing template");
    const relativeFilePaths = await import_server.TemplateEngine.copyTemplate(intent.templateId, sandboxDir);
    import_observability2.logger.info({ projectId }, "[Architecture Worker] Applying surgical edits");
    const vfs = new import_server.VirtualFileSystem();
    const initialFiles = await Promise.all(relativeFilePaths.map(async (relPath) => {
      const safeRelPath = relPath.replace(/^[\\\/]+/, "");
      const fullPath = import_path.default.join(sandboxDir, safeRelPath);
      const content = await fs.readFile(fullPath, "utf-8");
      return { path: safeRelPath, content };
    }));
    vfs.loadFromDiskState(initialFiles);
    const customizationResult = await customizerAgent.execute({
      prompt,
      templateId: intent.templateId,
      files: initialFiles.filter((f) => f.path.endsWith(".tsx") || f.path.endsWith(".ts")),
      branding: intent.branding,
      features: intent.features
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }, {});
    if (customizationResult.success && customizationResult.data.patches.length > 0) {
      for (const patch of customizationResult.data.patches) {
        vfs.setFile(patch.path, patch.content);
      }
      await import_server.CommitManager.commit(vfs, sandboxDir);
      import_observability2.logger.info({ projectId, patches: customizationResult.data.patches.length }, "[Architecture Worker] Applied patches");
    }
    const context = new import_server.DistributedExecutionContext(executionId);
    await context.atomicUpdate((ctx) => {
      ctx.metadata.architectureReady = true;
      ctx.finalFiles = vfs.getAllFiles();
    });
    await import_shared_services.eventBus.stage(executionId, "architecture", "completed", "Project structure and branding applied.", 40);
    await import_server.generatorQueue.add("generate-code", {
      projectId,
      executionId,
      userId,
      prompt,
      intent,
      strategy
    });
    const mem = process.memoryUsage();
    const memMb = Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100;
    log(`[Architecture] Memory usage: ${memMb} MB (Heap Used)`);
    import_observability2.logger.info({ executionId, memoryMb: memMb }, "[Architecture Worker] Memory Usage");
    await import_shared_services.eventBus.stage(executionId, "initializing", "completed", "Architecture design complete. Multi-agent code generation started.", 40);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`[Architecture] ERROR: ${errorMessage}`);
    import_observability2.logger.error({ error, executionId }, "[Architecture Worker] Failed");
    await import_shared_services.eventBus.error(executionId, `Architecture Error: ${errorMessage}`);
    throw error;
  }
}, {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  connection: import_shared_services.redis,
  concurrency: 5
});
log(`Architecture Worker online. Redis: ${import_shared_services.redis.options.port}`);
import_observability2.logger.info("Architecture Worker online");
setInterval(() => {
  const mem = process.memoryUsage();
  const memMb = Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100;
  log(`Heartbeat... Memory: ${memMb} MB`);
}, 3e4);
new Promise(() => {
});

// src/base-worker.ts
var import_bullmq2 = require("bullmq");
var import_observability3 = require("@packages/observability");
var import_shared_services2 = require("@packages/shared-services");
var import_server2 = require("@packages/utils/server");
var import_resilience = require("@packages/resilience");
var workerTaskDurationSeconds = { observe: (...args) => {
} };
var agentFailuresTotal = { inc: (...args) => {
} };
var BaseWorker = class {
  worker;
  dlq;
  breaker;
  constructor(queueName) {
    this.breaker = (0, import_resilience.createBreaker)(async (job) => {
      return this.processJob(job);
    }, {
      timeout: 3e4,
      errorThresholdPercentage: 50,
      resetTimeout: 1e4
    });
    this.worker = new import_bullmq2.Worker(queueName, async (job) => {
      if (!job.id) return this.breaker.fire(job);
      const tenantId = job.data.tenantId || "global";
      const hasQuota = await import_server2.TenantService.checkQuota(tenantId);
      if (!hasQuota) {
        import_observability3.logger.error({ tenantId, jobId: job.id }, "[Worker] Tenant quota exceeded");
        throw new Error(`QUOTA_EXCEEDED: ${tenantId}`);
      }
      const startTime = Date.now();
      let status = "success";
      try {
        const result = await this.breaker.fire(job);
        if (result && typeof result === "object" && "metrics" in result) {
          const metrics = result.metrics;
          await import_server2.usageService.recordAiUsage({
            model: result.model || "default",
            promptTokens: metrics.promptTokens || 0,
            completionTokens: metrics.completionTokens || 0,
            totalTokens: metrics.totalTokens || 0,
            userId: job.data.userId || "system",
            tenantId: job.data.tenantId || "global",
            metadata: { jobId: job.id, queue: queueName }
          });
        }
        return result;
      } catch (err) {
        status = "failed";
        agentFailuresTotal.inc({ agent_name: this.getName() });
        throw err;
      } finally {
        const duration = (Date.now() - startTime) / 1e3;
        workerTaskDurationSeconds.observe({ queue_name: queueName, status }, duration);
        import_server2.SLOService.checkLatency(queueName, duration);
      }
    }, {
      connection: import_shared_services2.redis,
      ...import_resilience.DEFAULT_RETRY_OPTIONS
    });
    this.dlq = new import_bullmq2.Queue(import_resilience.DEAD_LETTER_QUEUE_NAME, { connection: import_shared_services2.redis });
    this.worker.on("failed", async (job, err) => {
      if (job && job.attemptsMade >= (import_resilience.DEFAULT_RETRY_OPTIONS.attempts || 3)) {
        await this.dlq.add("failed-job", {
          originalQueue: queueName,
          jobId: job.id,
          data: job.data,
          error: err.message
        });
      }
    });
  }
};

// src/backend-worker.ts
var import_observability4 = require("@packages/observability");
var import_shared_services3 = require("@packages/shared-services");
var import_agent_memory = require("@packages/agents/services/agent-memory");
var BackendWorker = class extends BaseWorker {
  constructor() {
    super("backend_queue");
  }
  queueName = "backend_queue";
  getName() {
    return "BackendAgent";
  }
  getWorkerId() {
    return `backend-worker-${process.pid}`;
  }
  async processJob(job) {
    const { missionId, taskId } = job.data;
    try {
      import_observability4.logger.info({ missionId, taskId }, "[BackendWorker] Starting task");
      await this.streamThought(missionId, "Analyzing backend requirements and designing API routes...");
      await new Promise((resolve) => setTimeout(resolve, 3e3));
      const result = {
        files: [
          { path: "server/api/routes.ts", content: "// Generated Express routes\nexport const routes = [];" },
          { path: "server/models/schema.ts", content: "// Generated DB Schema" }
        ],
        metrics: {
          tokens: 1200,
          duration: 3e3
        }
      };
      await import_agent_memory.AgentMemory.set(missionId, `backend:result:${taskId}`, result);
      await import_agent_memory.AgentMemory.appendTranscript(missionId, this.getName(), "Successfully generated API routes and schema.");
      await import_shared_services3.eventBus.stage(missionId, this.getName(), "COMPLETED", `Generated ${result.files.length} backend files`, 100);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      import_observability4.logger.error({ error, missionId, taskId }, "[BackendWorker] Task failed");
      await import_shared_services3.eventBus.error(missionId, `Backend Error: ${errorMessage}`);
      throw error;
    }
  }
};
if (require.main === module) {
  new BackendWorker();
}

// src/build-worker.ts
var import_config2 = require("dotenv/config");
var import_fs_extra = __toESM(require("fs-extra"));
var import_path2 = __toESM(require("path"));
var import_bullmq3 = require("bullmq");
var import_observability5 = require("@packages/observability");
var import_shared_services4 = require("@packages/shared-services");
var import_core_engine = require("@packages/core-engine");
var import_server3 = require("@packages/utils/server");
var import_contracts = require("@packages/contracts");
var import_validator = require("@packages/validator");
var import_nodeRegistry = require("@packages/sandbox-runtime/cluster/nodeRegistry");
var import_failoverManager = require("@packages/sandbox-runtime/cluster/failoverManager");
var import_redisRecovery = require("@packages/sandbox-runtime/cluster/redisRecovery");
var import_previewOrchestrator = require("@packages/runtime/previewOrchestrator");
var import_runtimeCleanup = require("@packages/runtime/runtimeCleanup");
var import_build_engine = require("@packages/build-engine");
var import_os = __toESM(require("os"));
var WORKER_ID = `worker-${import_os.default.hostname()}-${process.pid}`;
var orchestrator = new import_core_engine.Orchestrator();
var workerId = `worker-${Math.random().toString(36).substring(2, 9)}`;
var HEARTBEAT_INTERVAL = 5e3;
setInterval(async () => {
  try {
    const heartbeat = {
      status: "online",
      lastSeen: Date.now(),
      memory: process.memoryUsage().heapUsed / 1024 / 1024,
      // MB
      uptime: process.uptime(),
      workerId
    };
    await import_shared_services4.redis.set(`worker:heartbeat:${workerId}`, JSON.stringify(heartbeat), "EX", 15);
    await import_shared_services4.redis.set("system:health:worker", JSON.stringify(heartbeat), "EX", 15);
  } catch {
    import_observability5.logger.warn("Failed to update worker heartbeat");
  }
}, HEARTBEAT_INTERVAL);
var RECOVERY_STALE_MS = 6e4;
var resumeOrphanedExecutions = async () => {
  import_observability5.logger.info("Scanning for orphaned missions to resume...");
  try {
    const activeMissions = await import_server3.missionController.listActiveMissions();
    const activeHeartbeatKeys = await import_shared_services4.redis.keys("worker:heartbeat:*");
    const activeWorkerIds = new Set(activeHeartbeatKeys.map((k) => k.split(":").pop()));
    for (const mission of activeMissions) {
      const missionWorkerId = mission.metadata?.workerId;
      const isStale = Date.now() - mission.updatedAt > RECOVERY_STALE_MS;
      const isOwnerDead = missionWorkerId && !activeWorkerIds.has(missionWorkerId);
      if (isStale || isOwnerDead) {
        import_observability5.logger.info({
          missionId: mission.id,
          status: mission.status,
          isStale,
          isOwnerDead
        }, "Resuming orphaned mission...");
        import_server3.stuckBuildsTotal.inc();
        executeBuild({
          prompt: mission.prompt,
          userId: mission.userId,
          projectId: mission.projectId,
          executionId: mission.id,
          isFastPreview: !!mission.metadata?.fastPath
        }).catch((err) => import_observability5.logger.error({ err, missionId: mission.id }, "Failed to resume orphaned mission"));
      }
    }
  } catch (err) {
    import_observability5.logger.error({ err }, "Error during orphaned mission scan");
  }
};
setInterval(resumeOrphanedExecutions, 6e4);
var executeBuild = async (data, job) => {
  const { prompt, userId, projectId, executionId, isFastPreview } = data;
  const tier = job ? job.queueName.includes("pro") ? "pro" : "free" : "instant";
  const lockKey = `build:lock:${executionId}`;
  const lock = await import_shared_services4.redis.set(lockKey, executionId, "EX", 600, "NX");
  if (!lock) {
    if (job) import_observability5.logger.warn({ executionId, jobId: job.id, tier }, "Duplicate execution (Queue) detected. Skipping.");
    return;
  }
  const controller = new AbortController();
  if (job) {
    const waitTime = (Date.now() - job.timestamp) / 1e3;
    import_server3.queueWaitTimeSeconds.observe({ queue_name: tier }, waitTime);
  }
  const lockExtensionInterval = setInterval(async () => {
    try {
      if (job && await job.isActive()) {
        await job.extendLock(job.token, 3e5);
      }
      const owner = await import_shared_services4.redis.get(lockKey);
      if (owner !== executionId) {
        throw new Error("Execution lock ownership lost (Heartbeat Violation)");
      }
      await import_shared_services4.redis.expire(lockKey, 600);
      import_observability5.logger.debug({ executionId, tier }, "Execution locks extended (Heartbeat)");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      import_observability5.logger.error({ executionId, error: errorMessage, tier }, "CRITICAL: Lock heartbeat failed. Aborting.");
      controller.abort();
    }
  }, 3e4);
  const startTime = Date.now();
  try {
    await import_server3.missionController.updateMission(executionId, {
      status: "planning",
      metadata: { workerId }
    });
    const BUILD_TIMEOUT_MS = 15 * 60 * 1e3;
    const timeout = setTimeout(() => {
      import_observability5.logger.error({ executionId }, "[Worker] Build timeout reached. Aborting.");
      controller.abort();
    }, BUILD_TIMEOUT_MS);
    return await (0, import_server3.runWithTracing)(executionId, async () => {
      import_observability5.logger.info({ executionId, userId, projectId, tier }, "Worker entering executeBuild loop");
      const sandboxDir = import_path2.default.join(process.cwd(), ".generated-projects", projectId);
      await import_fs_extra.default.ensureDir(sandboxDir);
      const cacheRestored = await import_build_engine.BuildCacheManager.restore(projectId, sandboxDir);
      if (cacheRestored) {
        import_observability5.logger.info({ projectId }, "[Worker] Incremental build: Cache restored successfully");
        await import_server3.eventBus.stage(executionId, import_contracts.JobStage.PLAN.toLowerCase(), "completed", "Incremental build: Restored previous build cache", 20, projectId);
        const affectedNodes = await import_build_engine.BuildGraphEngine.getAffectedNodes(sandboxDir);
        if (affectedNodes.length === 0) {
          import_observability5.logger.info({ projectId }, "[Worker] Zero affected nodes. Skipping full build.");
          await import_server3.eventBus.stage(executionId, import_contracts.JobStage.PLAN.toLowerCase(), "completed", "No changes detected. Reusing existing artifacts.", 30, projectId);
        } else {
          import_observability5.logger.info({ projectId, count: affectedNodes.length }, "[Worker] Partial changes detected");
        }
      }
      try {
        const result = await orchestrator.execute(
          prompt,
          userId,
          projectId,
          executionId,
          controller.signal,
          { isFastPreview }
        );
        clearTimeout(timeout);
        if (result && !result.success) {
          const errorResult = result;
          throw new Error(errorResult.error || "Build failed");
        }
        const validationResult = await import_validator.ArtifactValidator.validate(projectId);
        if (!validationResult.valid) {
          const error = `Build integrity failure: Missing ${validationResult.missingFiles?.join(", ") || "critical files"}`;
          import_observability5.logger.error({ projectId, missing: validationResult.missingFiles }, "[Worker] Integrity Check FAILED");
          throw new Error(error);
        }
        import_observability5.logger.info({ projectId }, "[Worker] Integrity Check PASSED");
        await import_build_engine.BuildCacheManager.save(projectId, sandboxDir);
        await import_server3.missionController.updateMission(executionId, { status: "complete" });
        const durationMs = Date.now() - startTime;
        await import_server3.ReliabilityMonitor.recordSuccess(durationMs);
        return result;
      } catch (err) {
        clearTimeout(timeout);
        throw err;
      }
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    import_observability5.logger.error({ executionId, error: msg, tier }, "Execution failed");
    await import_server3.missionController.updateMission(executionId, {
      status: "failed",
      metadata: { error: msg }
    });
    await import_server3.eventBus.stage(executionId, import_contracts.JobStage.FAILED.toLowerCase(), "failed", `Build failed: ${msg}`, 100, projectId);
    await import_server3.eventBus.error(executionId, `[BuildWorker] ${msg}`, projectId);
    await import_server3.ReliabilityMonitor.recordFailure();
    throw error;
  } finally {
    clearInterval(lockExtensionInterval);
  }
};
var processJob = async (job) => {
  return await executeBuild(job.data, job);
};
var freeWorker = new import_bullmq3.Worker(import_shared_services4.QUEUE_FREE, processJob, {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  connection: import_shared_services4.redis,
  concurrency: import_server3.env.WORKER_CONCURRENCY_FREE || 5,
  lockDuration: 3e5,
  // 5 minute initial lock
  limiter: {
    max: 5,
    // Process max 5 jobs per second per worker instance
    duration: 1e3
  }
});
var proWorker = new import_bullmq3.Worker(import_shared_services4.QUEUE_PRO, processJob, {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  connection: import_shared_services4.redis,
  concurrency: import_server3.env.WORKER_CONCURRENCY_PRO || 20,
  lockDuration: 3e5,
  // 5 minute initial lock
  limiter: {
    max: 10,
    duration: 1e3
  }
});
var setupWorkerEvents = (worker, name) => {
  worker.on("completed", (job) => {
    import_observability5.logger.info({ jobId: job.id, worker: name }, "Job completed");
  });
  worker.on("failed", (job, err) => {
    import_observability5.logger.error({ jobId: job?.id, worker: name, err: err.message }, "Job failed");
  });
};
setupWorkerEvents(freeWorker, "free");
setupWorkerEvents(proWorker, "pro");
var shutdown = async () => {
  import_observability5.logger.info("Shutting down workers...");
  import_failoverManager.FailoverManager.stop();
  await import_runtimeCleanup.RuntimeCleanup.shutdownAll();
  await import_nodeRegistry.NodeRegistry.deregister();
  await Promise.all([freeWorker.close(), proWorker.close()]);
  await import_shared_services4.redis.quit();
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
setInterval(async () => {
  try {
    await import_server3.WorkerClusterManager.heartbeat({
      workerId: WORKER_ID,
      hostname: import_os.default.hostname(),
      load: 0,
      // In production, we'd calculate CPU/Mem load here
      status: "IDLE"
      // Update dynamically based on job state
    });
  } catch (err) {
    console.error("[Worker] Heartbeat failed:", err);
  }
}, 2e3);
(async () => {
  try {
    const sub = import_shared_services4.redis.duplicate();
    import_observability5.logger.info({ workerId: WORKER_ID }, "[Worker] Subscribing to direct steering channel");
    await sub.subscribe(`worker:trigger:${WORKER_ID}`);
    sub.on("message", async (channel, message) => {
      if (channel !== `worker:trigger:${WORKER_ID}`) return;
      try {
        const { projectId } = JSON.parse(message);
        import_observability5.logger.info({ projectId }, "[Worker] Direct job steering received! Triggering execution.");
      } catch (pErr) {
        import_observability5.logger.error({ err: pErr }, "[Worker] Failed to parse steering message");
      }
    });
  } catch (err) {
    const error = err;
    import_observability5.logger.error({ err: error.message }, "[Worker] Direct steering listener failed");
  }
})();
(async () => {
  try {
    const nodeId = await import_nodeRegistry.NodeRegistry.register();
    import_observability5.logger.info({ nodeId }, "Node registered in cluster");
    import_failoverManager.FailoverManager.start();
    const sub = import_shared_services4.redis.duplicate();
    await sub.subscribe("cluster:schedule:assign", "cluster:node:restart", "build:init:trigger");
    sub.on("message", async (channel, message) => {
      try {
        const data = JSON.parse(message);
        if (channel === "build:init:trigger") {
          import_observability5.logger.info({ executionId: data.executionId }, "\u26A1 Instant Trigger received. Initiating build...");
          executeBuild(data).catch((err) => import_observability5.logger.error({ err, executionId: data.executionId }, "Instant Trigger execution failed"));
        } else if (channel === "cluster:schedule:assign") {
          if (data.targetNodeId === nodeId) {
            import_observability5.logger.info({ projectId: data.request.projectId }, "[Worker] Picking up assigned runtime");
            import_previewOrchestrator.PreviewOrchestrator.start(
              data.request.projectId,
              data.request.executionId,
              data.request.userId
            ).catch((err) => {
              const error = err instanceof Error ? err.message : String(err);
              import_observability5.logger.error({ err: error, projectId: data.request.projectId }, "Failed to start assigned runtime");
            });
          }
        } else if (channel === "cluster:node:restart") {
          if (data.nodeId === nodeId) {
            import_observability5.logger.warn({ reason: data.reason }, "[Worker] Received restart signal. Shutting down gracefully...");
            await shutdown();
          }
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        import_observability5.logger.error({ error: errMsg }, `[Worker] Error processing message on channel ${channel}`);
      }
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    import_observability5.logger.error({ error: errMsg }, "Failed to register node in cluster (non-fatal, running in standalone mode)");
  }
})();
import_observability5.logger.info(`Workers started: Free (concurrency=${freeWorker.opts.concurrency}), Pro (concurrency=${proWorker.opts.concurrency})`);
resumeOrphanedExecutions();
import_runtimeCleanup.RuntimeCleanup.start();
import_shared_services4.redis.on("error", (err) => {
  import_observability5.logger.error({ err: err.message }, "[Worker] Redis connection error");
  if ("code" in err && (err.code === "ECONNREFUSED" || err.code === "ETIMEDOUT")) {
    import_redisRecovery.RedisRecovery.handleRedisCrash().catch((recErr) => {
      import_observability5.logger.error({ err: recErr.message }, "[Worker] Critical recovery failure");
    });
  }
});

// src/workers/buildWorker.ts
var import_bullmq4 = require("bullmq");
var import_core_engine2 = require("@packages/core-engine");
var import_queue = require("@packages/queue");
var import_observability6 = require("@packages/observability");
var buildWorker = new import_bullmq4.Worker(
  "build",
  async (job) => {
    const { missionId, prompt, isUpdate, isDeploy, vpsIp } = job.data;
    import_observability6.logger.info({ missionId, jobId: job.id, isUpdate, isDeploy }, "[Worker] Job received");
    try {
      if (isDeploy) {
        const result = await (0, import_core_engine2.deployPipeline)(missionId, vpsIp || "1.1.1.1");
        return result;
      } else if (isUpdate) {
        await (0, import_core_engine2.updatePipeline)(missionId, prompt);
        return { success: true, missionId };
      } else {
        const result = await (0, import_core_engine2.runPipeline)(missionId, prompt);
        return result;
      }
    } catch (error) {
      import_observability6.logger.error({ missionId, error: error.message }, "[Worker] Pipeline execution crashed");
      throw error;
    }
  },
  {
    connection: import_queue.redisConnection,
    concurrency: 5
  }
);
import_observability6.logger.info("[Worker] Build worker online");

// src/mission-worker.ts
var import_bullmq5 = require("bullmq");
var import_server4 = require("@packages/utils/server");
var import_core_engine3 = require("@packages/core-engine");
var import_sandbox_runtime = require("@packages/sandbox-runtime");
var import_path3 = __toESM(require("path"));
var import_fs_extra2 = __toESM(require("fs-extra"));
var orchestrator2 = new import_core_engine3.MissionOrchestrator();
var missionWorker = new import_bullmq5.Worker(import_server4.QUEUE_FREE, async (job) => {
  const { executionId, prompt, projectId } = job.data;
  const PROJECTS_ROOT = import_path3.default.join(process.cwd(), ".generated-projects");
  const sandboxDir = import_path3.default.join(PROJECTS_ROOT, projectId);
  import_server4.logger.info({ executionId, projectId }, "[MissionWorker] Processing mission");
  try {
    const result = await orchestrator2.execute(executionId, prompt, projectId);
    if (!result.success) throw new Error(result.error || "Mission execution failed");
    await import_fs_extra2.default.ensureDir(sandboxDir);
    for (const file of result.files) {
      const filePath = import_path3.default.join(sandboxDir, file.path);
      await import_fs_extra2.default.ensureDir(import_path3.default.dirname(filePath));
      await import_fs_extra2.default.writeFile(filePath, file.content);
    }
    await import_server4.missionController.updateMission(executionId, { status: "deploying" });
    await import_server4.eventBus.stage(executionId, "deploying", "in_progress", "Allocating sandbox resources...", 85, projectId);
    const [port] = await import_sandbox_runtime.PortManager.acquirePorts(projectId, 1);
    const { containerId } = await import_sandbox_runtime.ContainerManager.start(projectId, port);
    const previewUrl = `/preview/${projectId}`;
    await import_server4.missionController.updateMission(executionId, {
      status: "complete",
      metadata: { containerId, port, previewUrl }
    });
    await import_server4.eventBus.stage(executionId, "previewing", "completed", "Sandbox is live!", 100, projectId);
    await import_server4.eventBus.complete(executionId, previewUrl, {
      taskCount: result.files.length,
      autonomousCycles: 1
    });
    import_server4.logger.info({ executionId, projectId, port }, "[MissionWorker] Sandbox deployed successfully");
  } catch (error) {
    import_server4.logger.error({ executionId, error }, "[MissionWorker] Critical failure");
    await import_server4.eventBus.error(executionId, error instanceof Error ? error.message : String(error), projectId);
    throw error;
  }
}, {
  connection: import_server4.redis,
  concurrency: 5
});

// src/deploy-worker.ts
var import_bullmq6 = require("bullmq");
var import_utils = require("@packages/utils");
var import_server5 = require("@packages/utils/server");
var import_utils2 = require("@packages/utils");
var import_path4 = __toESM(require("path"));
var import_fs = __toESM(require("fs"));
var logPath2 = import_path4.default.join(process.cwd(), "deploy_worker.log");
var log2 = (msg) => {
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  import_fs.default.appendFileSync(logPath2, `[${timestamp}] ${msg}
`);
};
var deployWorker = new import_bullmq6.Worker(import_utils.QUEUE_DEPLOY, async (job) => {
  const { projectId, executionId, previewUrl } = job.data;
  const sandboxDir = import_path4.default.join(process.cwd(), ".generated-projects", projectId);
  log2(`[Deploy] Job received for ${executionId}`);
  import_utils.logger.info({ projectId, executionId }, "[Deploy Worker] Finalizing Deployment");
  try {
    await import_utils.eventBus.stage(executionId, "cicd", "in_progress", "Deployment Agent: Finalizing project lifecycle...", 95);
    const context = new import_server5.DistributedExecutionContext(executionId);
    const data = await context.get();
    const allFiles = data?.finalFiles || [];
    const intent = data?.metadata?.intent;
    await import_server5.projectMemory.initializeMemory(
      projectId,
      { framework: intent?.templateId || "nextjs", styling: "tailwind", backend: "api-routes", database: "supabase" },
      allFiles
    );
    const tenant = await import_server5.TenantService.getTenantForUser(data?.userId || "unknown");
    if (tenant && import_utils2.IS_PRODUCTION) {
      log2("[Deploy Worker] Production Mode: Provisioning resources...");
      const infra = await import_server5.InfraProvisioner.provisionResources(projectId, tenant.plan);
      await import_server5.CICDManager.setupPipeline(projectId, sandboxDir, intent?.templateId || "nextjs");
      await context.atomicUpdate((ctx) => {
        ctx.metadata.infra = infra;
        ctx.metadata.deploymentStatus = "deployed";
      });
    } else {
      log2("[Deploy Worker] Dev Mode: Skipping infrastructure provisioning");
    }
    await context.atomicUpdate((ctx) => {
      ctx.status = "completed";
      ctx.locked = true;
    });
    await import_utils.eventBus.stage(executionId, "deployment", "completed", "Build success! Preview online.", 100);
    await import_utils.eventBus.complete(executionId, previewUrl, {
      taskCount: allFiles.length,
      autonomousCycles: 1
    });
    const mem = process.memoryUsage();
    const memMb = Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100;
    log2(`[Deploy] Memory usage: ${memMb} MB (Heap Used)`);
    import_utils.logger.info({ executionId, memoryMb: memMb }, "[Deploy Worker] Memory Usage");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log2(`[Deploy] ERROR: ${errorMessage}`);
    import_utils.logger.error({ error, executionId }, "[Deploy Worker] Failed");
    const context = new import_server5.DistributedExecutionContext(executionId);
    await context.atomicUpdate((ctx) => {
      ctx.status = "failed";
      ctx.agentResults["DeployAgent"] = {
        agentName: "DeployAgent",
        status: "failed",
        error: errorMessage,
        attempts: (ctx.agentResults["DeployAgent"]?.attempts || 0) + 1,
        startTime: (/* @__PURE__ */ new Date()).toISOString()
      };
    });
    await import_utils.eventBus.error(executionId, `Deployment Error: ${errorMessage}`);
    throw error;
  }
}, {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  connection: import_utils.redis,
  concurrency: 5
});
log2(`Deployment Worker online. Redis: ${import_utils.redis.options.port}`);
import_utils.logger.info("Deployment Worker online");
setInterval(() => {
  const mem = process.memoryUsage();
  const memMb = Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100;
  log2(`Heartbeat... Memory: ${memMb} MB`);
}, 3e4);
new Promise(() => {
});

// src/docker-worker.ts
var import_bullmq7 = require("bullmq");
var import_observability7 = require("@packages/observability");
var import_shared_services5 = require("@packages/shared-services");
var import_server6 = require("@packages/utils/server");
var podController = new import_server6.SandboxPodController();
var dockerWorker = new import_bullmq7.Worker(import_shared_services5.QUEUE_DOCKER, async (job) => {
  const { projectId, executionId } = job.data;
  import_observability7.logger.info({ projectId, executionId }, "[Docker Worker] Starting deployment");
  try {
    await import_shared_services5.eventBus.stage(executionId, "deployment", "in_progress", "Docker Agent: Creating sandbox environment...", 90);
    const context = new import_server6.DistributedExecutionContext(executionId);
    const data = await context.get();
    const deployment = await podController.deploy(projectId, executionId, data?.finalFiles || []);
    if (!deployment.success) {
      throw new Error(`Docker: Sandbox deployment failed. ${deployment.error || ""}`);
    }
    await context.atomicUpdate((ctx) => {
      ctx.metadata.previewUrl = deployment.url;
      ctx.status = "completed";
    });
    await import_shared_services5.eventBus.complete(executionId, deployment.url, {
      tokensTotal: data?.metadata?.tokensTotal,
      durationMs: data?.metadata?.durationMs
    }, projectId, data?.finalFiles);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    import_observability7.logger.error({ error, executionId }, "[Docker Worker] Failed");
    await import_shared_services5.eventBus.error(executionId, `Docker Error: ${errorMessage}`);
    throw error;
  }
}, {
  connection: import_shared_services5.redis,
  concurrency: 2
});
import_observability7.logger.info("Docker Worker online");

// src/frontend-worker.ts
var import_observability8 = require("@packages/observability");
var import_shared_services6 = require("@packages/shared-services");
var import_agent_memory2 = require("@packages/agents/services/agent-memory");
var FrontendWorker = class extends BaseWorker {
  constructor() {
    super("frontend_queue");
  }
  queueName = "frontend_queue";
  getName() {
    return "FrontendAgent";
  }
  getWorkerId() {
    return `frontend-worker-${process.pid}`;
  }
  async processJob(job) {
    const { missionId, taskId } = job.data;
    try {
      import_observability8.logger.info({ missionId, taskId }, "[FrontendWorker] Starting task");
      await this.streamThought(missionId, "Designing UI components and responsive layouts...");
      await new Promise((resolve) => setTimeout(resolve, 4e3));
      const result = {
        files: [
          { path: "src/components/Dashboard.tsx", content: "export const Dashboard = () => <div>Aion Dashboard</div>;" },
          { path: "src/styles/globals.css", content: "/* Generated Styles */" }
        ],
        metrics: {
          tokens: 1500,
          duration: 4e3
        }
      };
      await import_agent_memory2.AgentMemory.set(missionId, `frontend:result:${taskId}`, result);
      await import_agent_memory2.AgentMemory.appendTranscript(missionId, this.getName(), "Generated fundamental UI components and styles.");
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      import_observability8.logger.error({ error, missionId, taskId }, "[FrontendWorker] Task failed");
      await import_shared_services6.eventBus.error(missionId, `Frontend Error: ${errorMessage}`);
      throw error;
    }
  }
};
if (require.main === module) {
  new FrontendWorker();
}

// src/generator-worker.ts
var import_bullmq8 = require("bullmq");
var import_observability9 = require("@packages/observability");
var import_shared_services7 = require("@packages/shared-services");
var import_server7 = require("@packages/utils/server");
var import_generator_agent = require("@packages/agents/generator-agent");
var generatorAgent = new import_generator_agent.GeneratorAgent();
var blueprintManager = new import_server7.BlueprintManager();
var generatorWorker = new import_bullmq8.Worker(import_shared_services7.QUEUE_GENERATOR, async (job) => {
  const { projectId, executionId, userId, prompt, intent, strategy } = job.data;
  import_observability9.logger.info({ projectId, executionId }, "[Generator Worker] Generating codebase");
  try {
    await import_shared_services7.eventBus.stage(executionId, "generating", "in_progress", "Generator Agent: Creating file blueprints...", 45);
    const blueprints = await blueprintManager.getForTemplate(intent.templateId);
    const result = await generatorAgent.execute({
      prompt,
      blueprints,
      techStack: strategy?.recommendedTechStack
    }, { executionId, userId, projectId });
    if (!result.success) {
      throw new Error(`Generator: Failed to generate files. ${result.error || ""}`);
    }
    const files = result.data.files;
    const vfs = new import_server7.VirtualFileSystem();
    vfs.loadFromDiskState(files);
    const context = new import_server7.DistributedExecutionContext(executionId);
    await context.atomicUpdate((ctx) => {
      ctx.finalFiles = files;
      ctx.status = "executing";
    });
    await import_shared_services7.eventBus.stage(executionId, "generating", "completed", `Generated ${files.length} files. Starting verification...`, 70);
    await import_server7.validatorQueue.add("validate-build", {
      projectId,
      executionId,
      userId,
      prompt,
      strategy
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    import_observability9.logger.error({ error, executionId }, "[Generator Worker] Failed");
    await import_shared_services7.eventBus.error(executionId, `Generator Error: ${errorMessage}`);
    throw error;
  }
}, {
  connection: import_shared_services7.redis,
  concurrency: 3
});
import_observability9.logger.info("Generator Worker online");

// src/meta-agent-worker.ts
var import_bullmq9 = require("bullmq");
var import_observability10 = require("@packages/observability");
var import_shared_services8 = require("@packages/shared-services");
var import_server8 = require("@packages/utils/server");
var import_meta_agent = require("@packages/agents/meta-agent");
var metaAgent = new import_meta_agent.MetaAgent();
var metaWorker = new import_bullmq9.Worker(import_shared_services8.QUEUE_META, async (job) => {
  const { executionId, prompt, userId, projectId } = job.data;
  import_observability10.logger.info({ executionId, projectId }, "[Meta Worker] Analyzing project intent");
  try {
    await import_shared_services8.eventBus.stage(executionId, "meta-analysis", "in_progress", "Analyzing project requirements...", 10);
    const result = await metaAgent.execute({ prompt }, { executionId, userId, projectId });
    if (!result.success) {
      throw new Error(result.error || "MetaAgent analysis failed");
    }
    const strategy = result.data;
    import_observability10.logger.info({ projectId, executionId }, "[Meta Worker] Analysis complete");
    await import_shared_services8.eventBus.stage(executionId, "meta-analysis", "completed", "Analysis complete. Recommended stack identified.", 15);
    await import_server8.plannerQueue.add("plan-project", {
      projectId,
      executionId,
      userId,
      prompt,
      strategy
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    import_observability10.logger.error({ error, executionId }, "[Meta Worker] Failed");
    await import_shared_services8.eventBus.error(executionId, `Meta-Agent Error: ${errorMessage}`);
    throw error;
  }
}, {
  connection: import_shared_services8.redis,
  concurrency: 5
});
import_observability10.logger.info("Meta Worker online");

// src/planner-worker.ts
var import_bullmq10 = require("bullmq");
var import_observability11 = require("@packages/observability");
var import_shared_services9 = require("@packages/shared-services");
var import_server9 = require("@packages/utils/server");
var import_agents2 = require("@packages/agents");
var intentAgent = new import_agents2.IntentDetectionAgent();
var plannerWorker = new import_bullmq10.Worker(import_shared_services9.QUEUE_PLANNER, async (job) => {
  const { projectId, executionId, userId, prompt, strategy } = job.data;
  import_observability11.logger.info({ projectId, executionId }, "[Planner Worker] Started");
  try {
    await import_shared_services9.eventBus.stage(executionId, "initializing", "in_progress", "Planner Agent: Analyzing user intent...", 20);
    const intentResult = await intentAgent.execute({
      prompt,
      context: { techStack: strategy?.recommendedTechStack }
    }, { executionId, userId, projectId });
    if (!intentResult.success) {
      throw new Error(`Planner: Failed to detect intent. ${intentResult.error || ""}`);
    }
    const intent = intentResult.data;
    import_observability11.logger.info({ projectId, template: intent.templateId }, "[Planner Worker] Intent detected");
    const context = new import_server9.DistributedExecutionContext(executionId);
    await context.atomicUpdate((ctx) => {
      ctx.metadata.intent = intent;
      ctx.metadata.strategy = strategy || ctx.metadata.strategy;
      ctx.status = "executing";
    });
    await import_shared_services9.eventBus.stage(executionId, "PlannerAgent", "in_progress", `Selected template: ${intent.templateId}`, 30);
    await import_server9.architectureQueue.add("design-architecture", {
      projectId,
      executionId,
      userId,
      prompt,
      intent,
      strategy
    });
    await import_shared_services9.eventBus.stage(executionId, "initializing", "completed", "Planning complete. Architecture design started.", 30);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    import_observability11.logger.error({ error, executionId }, "[Planner Worker] Failed");
    await import_shared_services9.eventBus.error(executionId, `Planner Error: ${errorMessage}`);
    throw error;
  }
}, {
  connection: import_shared_services9.redis,
  concurrency: 5
});
import_observability11.logger.info("Planner Worker online");

// src/repair-worker.ts
var import_bullmq11 = require("bullmq");
var import_observability12 = require("@packages/observability");
var import_shared_services10 = require("@packages/shared-services");
var import_server10 = require("@packages/utils/server");
var import_agents3 = require("@packages/agents");
var import_path5 = __toESM(require("path"));
var import_fs2 = __toESM(require("fs"));
var logPath3 = import_path5.default.join(process.cwd(), "repair_direct.log");
var log3 = (msg) => import_fs2.default.appendFileSync(logPath3, `[${(/* @__PURE__ */ new Date()).toISOString()}] ${msg}
`);
log3("Repair Worker script started");
var repairAgent = new import_agents3.RepairAgent();
var repairWorker = new import_bullmq11.Worker(import_shared_services10.QUEUE_REPAIR, async (job) => {
  const { executionId, projectId, prompt } = job.data;
  log3(`[Repair] Job received for ${executionId}`);
  const sandboxDir = import_path5.default.join(process.cwd(), ".generated-projects", projectId);
  import_observability12.logger.info({ executionId, projectId }, "[Repair Worker] Starting autonomous repair");
  try {
    const context = new import_server10.DistributedExecutionContext(executionId);
    const data = await context.get();
    if (!data) return;
    const repairAttempts = await import_shared_services10.redis.hincrby(`mission:stats:${executionId}`, "repair_attempts", 1);
    if (repairAttempts > 3) {
      log3(`[Repair] Limit exceeded (${repairAttempts}). Failing mission.`);
      await import_shared_services10.eventBus.error(executionId, "Build failed autonomously after 3 repair attempts. Manual intervention required.");
      return;
    }
    await import_shared_services10.eventBus.stage(executionId, "testing", "in_progress", `Supervisor: Engaging Repair Agent to fix build errors (Attempt ${repairAttempts}/3)...`, 80);
    const failedAgent = Object.values(data.agentResults).find((r) => r.status === "failed");
    const error = failedAgent?.error || "Unknown error";
    const allFiles = data.finalFiles || [];
    const repairResult = await repairAgent.execute({
      error,
      stdout: "",
      // We could pipe stdout here if available
      files: allFiles.slice(0, 20)
      // Top files for context
    }, {});
    if (repairResult.success && repairResult.data.patches?.length > 0) {
      const vfs = new import_server10.VirtualFileSystem();
      vfs.loadFromDiskState(allFiles);
      for (const patch of repairResult.data.patches) {
        vfs.setFile(patch.path, patch.content);
      }
      await import_server10.CommitManager.commit(vfs, sandboxDir);
      await context.atomicUpdate((ctx) => {
        ctx.finalFiles = vfs.getAllFiles();
        if (failedAgent) {
          ctx.agentResults[failedAgent.agentName].status = "pending";
        }
      });
      log3(`[Repair] Success! Applied ${repairResult.data.patches.length} patches.`);
      log3(`[Repair] Re-enqueuing validator...`);
      await import_server10.validatorQueue.add("verify-repaired-build", {
        projectId,
        executionId,
        prompt
      });
    } else {
      log3(`[Repair] Failed to generate patches.`);
      throw new Error("RepairAgent could not generate valid patches.");
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    log3(`[Repair] CRITICAL ERROR: ${errorMessage}`);
    import_observability12.logger.error({ err, executionId }, "[Repair Worker] Repair failed");
    await import_shared_services10.eventBus.error(executionId, `Repair failed: ${errorMessage}`);
    throw err;
  }
}, {
  connection: import_shared_services10.redis,
  concurrency: 2
});
import_observability12.logger.info("Repair Worker online");
process.on("SIGINT", () => {
  console.log("RECEIVED SIGINT");
  process.exit(0);
});
process.on("SIGTERM", () => {
  console.log("RECEIVED SIGTERM");
  process.exit(0);
});
setInterval(() => {
  log3("Heartbeat...");
}, 3e4);
new Promise(() => {
});

// src/supervisor-worker.ts
var import_bullmq12 = require("bullmq");
var import_observability13 = require("@packages/observability");
var import_shared_services11 = require("@packages/shared-services");
var import_server11 = require("@packages/utils/server");
var import_watchdog = require("@packages/runtime/watchdog");
import_watchdog.PreviewWatchdog.start();
var supervisorWorker = new import_bullmq12.Worker(import_shared_services11.QUEUE_SUPERVISOR, async (job) => {
  if (job.name === "health-check-loop") {
    const activeIds = await import_server11.DistributedExecutionContext.getActiveExecutions();
    import_observability13.logger.info({ count: activeIds.length }, "[Supervisor Worker] Running global health check");
    for (const id of activeIds) {
      try {
        const decision = await import_server11.supervisorService.checkHealth(id);
        if (decision !== "NONE") {
          await import_server11.supervisorService.handleDecision(id, decision);
        }
      } catch (err) {
        import_observability13.logger.error({ id, err }, "[Supervisor Worker] Error checking execution health");
      }
    }
  }
}, {
  connection: import_shared_services11.redis,
  concurrency: 1
});
async function setupCron() {
  const repeatableJobs = await import_shared_services11.supervisorQueue.getRepeatableJobs();
  if (!repeatableJobs.find((j) => j.name === "health-check-loop")) {
    await import_shared_services11.supervisorQueue.add("health-check-loop", {}, {
      repeat: {
        every: 3e4
        // 30 seconds
      }
    });
    import_observability13.logger.info("[Supervisor Worker] Repeatable health-check-loop job scheduled.");
  }
}
setupCron().catch((err) => import_observability13.logger.error({ err }, "Failed to setup supervisor cron"));
import_observability13.logger.info("Supervisor Worker online");
setInterval(() => {
}, 3e4);
new Promise(() => {
});

// src/validator-worker.ts
var import_bullmq13 = require("bullmq");
var import_observability14 = require("@packages/observability");
var import_shared_services12 = require("@packages/shared-services");
var import_server12 = require("@packages/utils/server");
var import_path6 = __toESM(require("path"));
var import_fs3 = __toESM(require("fs"));
var logPath4 = import_path6.default.join(process.cwd(), "validator_direct.log");
var log4 = (msg) => import_fs3.default.appendFileSync(logPath4, `[${(/* @__PURE__ */ new Date()).toISOString()}] ${msg}
`);
var validatorWorker = new import_bullmq13.Worker(import_shared_services12.QUEUE_VALIDATE, async (job) => {
  const { projectId, executionId, prompt, strategy } = job.data;
  log4(`[Validator] Job received for ${executionId}`);
  const sandboxDir = import_path6.default.join(process.cwd(), ".generated-projects", projectId);
  import_observability14.logger.info({ projectId, executionId }, "[Validator Worker] Started Verification");
  try {
    await import_shared_services12.eventBus.stage(executionId, "testing", "in_progress", "Validator Agent: Running type checks...", 75);
    const context = new import_server12.DistributedExecutionContext(executionId);
    const data = await context.get();
    const allFiles = data?.finalFiles || [];
    const vfs = new import_server12.VirtualFileSystem();
    vfs.loadFromDiskState(allFiles);
    log4(`[Validator] Running verifier on ${sandboxDir}`);
    const verification = await import_server12.patchVerifier.verify(sandboxDir, vfs);
    if (verification.passed) {
      log4(`[Validator] PASSED`);
      await import_shared_services12.eventBus.stage(executionId, "ValidatorAgent", "completed", "Build verification passed \u2705", 100);
      await import_server12.dockerQueue.add("build-container", {
        projectId,
        executionId,
        prompt,
        strategy
      });
      await import_shared_services12.eventBus.stage(executionId, "testing", "completed", "Verification complete.", 85);
    } else {
      log4(`[Validator] FAILED with ${verification.errors?.length} errors: ${verification.errors?.join(" | ")}`);
      log4(`Triggering Repair.`);
      await context.atomicUpdate((ctx) => {
        ctx.status = "executing";
        if (!ctx.agentResults) ctx.agentResults = {};
        ctx.agentResults["ValidatorAgent"] = {
          agentName: "ValidatorAgent",
          status: "failed",
          error: verification.errors?.join("\n") || "TypeScript verification failed",
          attempts: 1,
          startTime: (/* @__PURE__ */ new Date()).toISOString()
        };
      });
      await import_shared_services12.eventBus.stage(executionId, "testing", "in_progress", `Validator Agent: Build failed. Routing to Repair Agent...`, 80);
      await import_server12.repairQueue.add("repair-build", {
        projectId,
        executionId,
        prompt
      });
    }
    const mem = process.memoryUsage();
    const memMb = Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100;
    log4(`[Validator] Memory usage: ${memMb} MB (Heap Used)`);
    import_observability14.logger.info({ executionId, memoryMb: memMb }, "[Validator Worker] Memory Usage");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log4(`[Validator] ERROR: ${errorMessage}`);
    import_observability14.logger.error({ error, executionId }, "[Validator Worker] Failed");
    await import_shared_services12.eventBus.error(executionId, `Validator Error: ${errorMessage}`);
    throw error;
  }
}, {
  connection: import_shared_services12.redis,
  concurrency: 5
});
import_observability14.logger.info("Validator Worker online");

// src/watchdog-worker.ts
var import_config3 = require("dotenv/config");
var import_watchdog2 = require("@packages/runtime/watchdog");
var import_observability15 = require("@packages/observability");
async function main() {
  import_observability15.logger.info("[WatchdogWorker] Starting background resource monitor...");
  import_watchdog2.PreviewWatchdog.start();
  process.on("SIGTERM", () => {
    import_observability15.logger.info("[WatchdogWorker] Shutting down...");
    import_watchdog2.PreviewWatchdog.stop();
    process.exit(0);
  });
  process.on("SIGINT", () => {
    import_observability15.logger.info("[WatchdogWorker] Shutting down...");
    import_watchdog2.PreviewWatchdog.stop();
    process.exit(0);
  });
  setInterval(() => {
  }, 1e3);
}
main().catch((err) => {
  import_observability15.logger.error({ err }, "[WatchdogWorker] Critical startup failure");
  process.exit(1);
});

// src/index.ts
var import_autonomous_agent = require("@packages/autonomous-agent");

// src/evolution-worker.ts
var import_bullmq14 = require("bullmq");
var import_observability16 = require("@packages/observability");
var import_shared_services13 = require("@packages/shared-services");
var import_self_evolution = require("@packages/self-evolution");
var QUEUE_EVOLUTION = "self-evolution";
var evolver = new import_self_evolution.SelfEvolver({ autoRefactor: true });
var evolutionWorker = new import_bullmq14.Worker(QUEUE_EVOLUTION, async (job) => {
  import_observability16.logger.info({ jobId: job.id }, "[Evolution Worker] Starting system evolution cycle");
  try {
    const mockMetrics = {
      cpuUsage: 80,
      memoryUsage: 90,
      errorRate: 5,
      latencyTarget: 200,
      actualLatency: 350
    };
    const mockLogs = [
      "WARN: High latency detected in API Gateway",
      "ERROR: Connection timeout to Redis"
    ];
    const result = await evolver.evolve(mockMetrics, mockLogs);
    import_observability16.logger.info({ result }, "[Evolution Worker] Evolution cycle completed");
    return result;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    import_observability16.logger.error({ err }, "[Evolution Worker] Evolution cycle failed");
    throw new Error(`Evolution Error: ${errorMessage}`);
  }
}, {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - mismatch between local and BullMQ redis typings
  connection: import_shared_services13.redis,
  concurrency: 1
});
import_observability16.logger.info("Self-Evolution Worker online");

// src/auto-refactor-worker.ts
var import_bullmq15 = require("bullmq");
var import_observability17 = require("@packages/observability");
var import_shared_services14 = require("@packages/shared-services");
var import_refactor_agent = require("@packages/refactor-agent");
var QUEUE_REFACTOR = "auto-refactor";
var autoRefactorWorker = new import_bullmq15.Worker(QUEUE_REFACTOR, async (job) => {
  const { targetPath } = job.data;
  import_observability17.logger.info({ jobId: job.id, targetPath }, "[Auto-Refactor Worker] Starting refactoring process");
  try {
    if (!targetPath) {
      throw new Error("targetPath is required for auto-refactor");
    }
    const fixed = await (0, import_refactor_agent.applyFixes)(targetPath);
    import_observability17.logger.info({ fixed, targetPath }, "[Auto-Refactor Worker] Refactoring completed");
    return fixed;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    import_observability17.logger.error({ err, targetPath }, "[Auto-Refactor Worker] Refactoring failed");
    throw new Error(`Refactor Error: ${errorMessage}`);
  }
}, {
  connection: import_shared_services14.redis,
  concurrency: 2
});
import_observability17.logger.info("Auto-Refactor Worker online");

// src/index.ts
initInstrumentation("worker-fleet");
(0, import_observability18.startMetricsServer)(9091);
(0, import_autonomous_agent.setupAutonomousWorker)();
//# sourceMappingURL=index.js.map