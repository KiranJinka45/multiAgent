var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/services/supabase-admin.ts
var supabase_admin_exports = {};
__export(supabase_admin_exports, {
  getSupabaseAdmin: () => getSupabaseAdmin,
  supabaseAdmin: () => supabaseAdmin
});
import { createServerSupabaseClient } from "@libs/supabase";
function getSupabaseAdmin(url, key) {
  const finalUrl = url || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const finalKey = key || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!finalUrl || !finalKey) {
    throw new Error("[SupabaseAdmin] Both URL and Service Role Key are required. Provide them as arguments or set SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY env vars.");
  }
  return createServerSupabaseClient(finalUrl, finalKey);
}
var supabaseAdmin;
var init_supabase_admin = __esm({
  "src/services/supabase-admin.ts"() {
    supabaseAdmin = null;
  }
});

// src/config/logger.ts
import pino from "pino";

// src/config/tracing.ts
import { v4 as uuidv4 } from "uuid";
import { AsyncLocalStorage } from "async_hooks";
var tracingContext = new AsyncLocalStorage();
function getCorrelationId() {
  return tracingContext.getStore() || "no-correlation-id";
}
function runWithTracing(id, fn) {
  const correlationId = id || uuidv4();
  return tracingContext.run(correlationId, fn);
}

// src/config/logger.ts
import { trace, context } from "@opentelemetry/api";
var logger = pino({
  level: process.env.LOG_LEVEL || "info",
  base: {
    env: process.env.NODE_ENV,
    service: "multi-agent-platform"
  },
  mixin() {
    const span = trace.getSpan(context.active());
    const spanContext = span?.spanContext();
    return {
      correlationId: getCorrelationId(),
      traceId: spanContext?.traceId,
      spanId: spanContext?.spanId
    };
  },
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    }
  },
  timestamp: pino.stdTimeFunctions.isoTime
});
function getExecutionLogger(executionId) {
  return logger.child({ executionId });
}
var logger_default = logger;

// src/logger.ts
var logger_default2 = logger_default;

// src/queue-manager.ts
import { Queue, QueueEvents } from "bullmq";

// src/services/redis.ts
import Redis from "ioredis";
var REDIS_URLS = process.env.REDIS_URLS ? process.env.REDIS_URLS.split(",") : [process.env.REDIS_URL || "redis://localhost:6379"];
var SENTINEL_NAME = process.env.REDIS_SENTINEL_NAME || null;
var RedisClient = class {
  static instance;
  static getInstance() {
    if (!this.instance) {
      const commonOptions = {
        maxRetriesPerRequest: null,
        // Critical for BullMQ
        connectTimeout: 5e3,
        // Fail fast on boot
        retryStrategy: (times) => {
          const isDev = process.env.NODE_ENV !== "production";
          if (!isDev && times > 20) {
            logger_default.error("Redis connection failed permanently. Halting.");
            return null;
          }
          const delay = Math.min(times * 100, 3e3);
          if (times % 5 === 0) {
            logger_default.warn({ times, nextRetryIn: delay }, "Redis unreachable. Retrying...");
          }
          return delay;
        },
        reconnectOnError: (err) => {
          const targetError = "READONLY";
          if (err.message.includes(targetError)) {
            return true;
          }
          return false;
        }
      };
      if (SENTINEL_NAME) {
        const sentinels = REDIS_URLS.map((url) => {
          const parsed = new URL(url);
          return { host: parsed.hostname, port: Number(parsed.port) };
        });
        this.instance = new Redis({
          sentinels,
          name: SENTINEL_NAME,
          ...commonOptions
        });
      } else {
        const redisUrl = REDIS_URLS[0];
        const isSecure = redisUrl.startsWith("rediss://") || process.env.REDIS_TLS === "true";
        const connectionOptions = {
          ...commonOptions
        };
        if (isSecure) {
          connectionOptions.tls = { rejectUnauthorized: false };
        }
        logger_default.info({ isSecure, urlPrefix: redisUrl.substring(0, 8) }, "Initializing Redis Connection");
        this.instance = new Redis(redisUrl, connectionOptions);
      }
      this.instance.on("connect", () => logger_default.info("Redis connected successfully"));
      this.instance.on("ready", () => logger_default.info("Redis ready to receive commands"));
      this.instance.on("error", (err) => logger_default.error({ err: err.message || err }, "Redis connection error"));
    }
    return this.instance;
  }
  static async quit() {
    if (this.instance) {
      await this.instance.quit();
      logger_default.info("Redis connection closed");
    }
  }
  static getIndependentClients() {
    const commonOptions = { maxRetriesPerRequest: null, connectTimeout: 5e3 };
    return REDIS_URLS.map((url) => new Redis(url, commonOptions));
  }
};
process.on("SIGTERM", async () => {
  logger_default.info("SIGTERM received, closing Redis...");
  await RedisClient.quit();
});
var redis = RedisClient.getInstance();
var independentRedisClients = REDIS_URLS.length > 1 ? RedisClient.getIndependentClients() : [redis];
var redis_default = redis;

// src/queue-manager.ts
var QueueManager = class {
  queues = /* @__PURE__ */ new Map();
  eventListeners = /* @__PURE__ */ new Map();
  getQueue(name) {
    if (!this.queues.has(name)) {
      const queue = new Queue(name, {
        connection: redis_default,
        defaultJobOptions: {
          attempts: 5,
          backoff: {
            type: "exponential",
            delay: 1e4
            // Start with 10s
          },
          removeOnComplete: {
            age: 3600 * 24,
            // Keep for 24h
            count: 1e3
          },
          removeOnFail: {
            age: 3600 * 24 * 7,
            // Keep failed for 7 days (DLQ behavior)
            count: 5e3
          }
        }
      });
      this.queues.set(name, queue);
    }
    return this.queues.get(name);
  }
  async addJob(queueName, data, jobId) {
    const queue = this.getQueue(queueName);
    const job = await queue.add(queueName, data, { jobId });
    logger_default2.info({ queueName, jobId: job.id }, "[QueueManager] Job added");
    return job;
  }
  async onJobCompleted(queueName, callback) {
    if (!this.eventListeners.has(queueName)) {
      const events = new QueueEvents(queueName, { connection: redis_default });
      this.eventListeners.set(queueName, events);
    }
    this.eventListeners.get(queueName).on("completed", ({ jobId, returnvalue }) => {
      callback(jobId, returnvalue);
    });
  }
  async onJobFailed(queueName, callback) {
    if (!this.eventListeners.has(queueName)) {
      const events = new QueueEvents(queueName, { connection: redis_default });
      this.eventListeners.set(queueName, events);
    }
    this.eventListeners.get(queueName).on("failed", ({ jobId, failedReason }) => {
      callback(jobId, new Error(failedReason));
    });
  }
};
var queueManager = new QueueManager();

// src/strategy-engine.ts
var AgentMetrics = {
  getAgentStats: async (agentName) => {
    return [];
  }
};
var StrategyEngine = class {
  /**
   * Determines the optimal strategy for an agent based on historical performance.
   */
  static async getOptimalStrategy(agentName, taskType) {
    const stats = await AgentMetrics.getAgentStats(agentName);
    const taskStats = stats?.find((s) => s.task_type === taskType);
    let strategy = "direct_generation";
    let temperature = 0.7;
    if (taskStats) {
      const successRate = taskStats.success_rate || 0;
      if (successRate < 0.75) {
        logger_default.warn({ agentName, successRate }, "[StrategyEngine] Performance below threshold. Escalating to memory_augmented strategy.");
        strategy = "memory_augmented";
        temperature = 0.5;
      } else if (successRate > 0.95) {
        logger_default.info({ agentName }, "[StrategyEngine] High performance detected. Optimizing for speed.");
        temperature = 0.8;
      }
    }
    return {
      strategy,
      temperature,
      contextWindow: 4e3,
      model: "llama-3.1-8b-instant"
    };
  }
  /**
   * Optimizes a prompt based on learned patterns (Mock implementation).
   */
  static async optimizePrompt(basePrompt, agentName) {
    if (agentName === "UIAgent" && !basePrompt.includes("Tailwind")) {
      return `${basePrompt}
Ensure accessibility standards and use Tailwind CSS for styling.`;
    }
    return basePrompt;
  }
};

// src/eject-system.ts
import archiver from "archiver";
import fs from "fs-extra";
import path from "path";
var EjectSystem = class {
  static STORAGE_DIR = path.join(process.cwd(), "artifact-storage", "ejects");
  static async eject(missionId, projectPath) {
    await fs.ensureDir(this.STORAGE_DIR);
    const ejectPath = path.join(this.STORAGE_DIR, `${missionId}.zip`);
    const output = fs.createWriteStream(ejectPath);
    const archive = archiver("zip", { zlib: { level: 9 } });
    return new Promise((resolve, reject) => {
      output.on("close", () => {
        logger_default.info({ missionId, size: archive.pointer() }, "[Eject] Bundle created");
        resolve(ejectPath);
      });
      archive.on("error", (err) => reject(err));
      archive.pipe(output);
      archive.directory(projectPath, "src");
      const infraDir = path.join(process.cwd(), "infrastructure");
      archive.directory(path.join(infraDir, "docker"), "infrastructure/docker");
      archive.directory(path.join(infraDir, "terraform"), "infrastructure/terraform");
      archive.append(`
# Aion Generated Project: ${missionId}

## Deployment
1. Run \`docker-compose up --build\` in \`infrastructure/docker\`
2. Apply terraform scripts in \`infrastructure/terraform\`
            `, { name: "README.md" });
      archive.finalize();
    });
  }
};

// src/services/persistence-store.ts
init_supabase_admin();
var PersistenceStore = class {
  /**
   * Atomically log a build state transition.
   */
  static async upsertBuild(build) {
    if (!supabaseAdmin) return;
    try {
      const { error } = await supabaseAdmin.from("builds").upsert({
        id: build.id,
        project_id: build.project_id,
        status: build.status,
        current_stage: build.current_stage,
        progress_percent: build.progress_percent,
        message: build.message,
        tokens_used: build.tokens_used,
        duration_ms: build.duration_ms,
        cost_usd: build.cost_usd,
        preview_url: build.preview_url,
        metadata: build.metadata,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      });
      if (error) logger_default.error({ error, buildId: build.id }, "[PersistenceStore] Build Upsert Error");
    } catch (err) {
      logger_default.error({ err }, "[PersistenceStore] Fatal DB Error during build upsert");
    }
  }
  /**
   * Store a granular event for history/replay.
   */
  static async logEvent(event) {
    if (!supabaseAdmin) return;
    try {
      const { error } = await supabaseAdmin.from("build_events").insert({
        execution_id: event.execution_id,
        type: event.type,
        agent_name: event.agent_name,
        action: event.action,
        message: event.message,
        data: event.data,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      if (error) logger_default.error({ error, executionId: event.execution_id }, "[PersistenceStore] Event Logging Error");
    } catch (err) {
      logger_default.error({ err }, "[PersistenceStore] Fatal DB Error during event log");
    }
  }
  /**
   * Ensure a project exists in the DB.
   */
  static async ensureProject(projectId, name, userId) {
    if (!supabaseAdmin) return;
    try {
      const { error } = await supabaseAdmin.from("projects").upsert({
        id: projectId,
        name,
        user_id: userId,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      });
      if (error) logger_default.error({ error, projectId }, "[PersistenceStore] Project Sync Error");
    } catch (err) {
      logger_default.error({ err }, "[PersistenceStore] Fatal DB Error during project sync");
    }
  }
};

// src/services/event-bus.ts
var STREAM_TTL_SECONDS = 4 * 60 * 60;
var THROTTLE_MS = 100;
var throttleMap = /* @__PURE__ */ new Map();
var EventBatcher = class {
  queue = [];
  timer = null;
  maxBatchSize = 10;
  batchWaitMs = 50;
  // Aggregate for 50ms
  async add(event) {
    this.queue.push(event);
    if (this.queue.length >= this.maxBatchSize) {
      await this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.batchWaitMs);
    }
  }
  async flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.queue.length === 0) return;
    const batch = [...this.queue];
    this.queue = [];
    await Promise.all(batch.map((event) => this.publishImmediate(event)));
  }
  async publishImmediate(event) {
    const { executionId } = event;
    const streamKey = `build:stream:${executionId}`;
    const stateKey = `build:state:${executionId}`;
    const pubChannel = `build:progress:${executionId}`;
    const payload = JSON.stringify(event);
    try {
      const pipeline = redis.pipeline();
      pipeline.xadd(streamKey, "MAXLEN", "~", 500, "*", "data", payload);
      pipeline.expire(streamKey, STREAM_TTL_SECONDS);
      pipeline.setex(stateKey, STREAM_TTL_SECONDS, payload);
      if (event.type === "stage" || event.type === "agent" || event.type === "error" || event.type === "complete") {
        PersistenceStore.logEvent({
          execution_id: event.executionId,
          type: event.type,
          agent_name: event.agent || event.metadata?.agent,
          action: event.action,
          message: event.message,
          data: event.metadata || {}
        }).catch(() => {
        });
      }
      pipeline.publish(pubChannel, payload);
      if (event.projectId) {
        pipeline.publish("build-events", payload);
      }
      await pipeline.exec();
    } catch (err) {
      logger_default.error({ err, executionId }, "[EventBus] Failed to publish build event");
    }
  }
};
var batcher = new EventBatcher();
async function publishBuildEvent(event) {
  const { executionId, type } = event;
  if (type === "progress" || type === "thought") {
    const throttleKey = `${executionId}:${type}`;
    const now = Date.now();
    const last = throttleMap.get(throttleKey) || 0;
    if (now - last < THROTTLE_MS) {
      return;
    }
    throttleMap.set(throttleKey, now);
  }
  if (type === "error" || type === "complete" || type === "stage") {
    return batcher.publishImmediate(event);
  }
  return batcher.add(event);
}
async function readBuildEvents(executionId, lastId, blockMs = 2e4) {
  const streamKey = `build:stream:${executionId}`;
  try {
    const result = await redis.xread(
      "BLOCK",
      blockMs,
      "COUNT",
      50,
      "STREAMS",
      streamKey,
      lastId
    );
    if (!result || !result[0]) return null;
    const [, messages] = result[0];
    return messages.map(([id, fields]) => {
      const dataIdx = fields.indexOf("data");
      const raw = dataIdx !== -1 ? fields[dataIdx + 1] : "{}";
      const event = JSON.parse(raw);
      return [id, event];
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("timeout") && !msg.includes("ECONNRESET")) {
      logger_default.error({ err, executionId }, "[EventBus] xread error");
    }
    return null;
  }
}
async function getLatestBuildState(executionId) {
  try {
    const raw = await redis.get(`build:state:${executionId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
var eventBus = {
  /** Emit a progress event */
  progress(executionId, progress, message, stage, status = "executing", projectId, metrics) {
    return publishBuildEvent({
      type: "progress",
      executionId,
      projectId,
      timestamp: Date.now(),
      progress,
      totalProgress: progress,
      message,
      currentStage: stage,
      status,
      tokensUsed: metrics?.tokens,
      durationMs: metrics?.duration,
      costUsd: metrics?.cost
    });
  },
  /** Emit a stage transition event */
  stage(executionId, stageId, stageStatus, message, progress, projectId, files, metrics) {
    return publishBuildEvent({
      type: "stage",
      executionId,
      projectId,
      timestamp: Date.now(),
      currentStage: stageId,
      status: stageStatus,
      message: `[Stage] ${message}`,
      progress,
      totalProgress: progress,
      files,
      tokensUsed: metrics?.tokens,
      durationMs: metrics?.duration,
      costUsd: metrics?.cost
    });
  },
  /** Emit an AI agent thought / log line */
  thought(executionId, agent, thought, projectId) {
    return publishBuildEvent({
      type: "thought",
      executionId,
      projectId,
      timestamp: Date.now(),
      message: thought,
      metadata: { agent }
    });
  },
  /** Emit final completion event and schedule stream cleanup */
  async complete(executionId, previewUrl, metadata, projectId, files) {
    const tokens = Number(metadata?.tokensTotal || 0);
    const duration = Number(metadata?.durationMs || 0);
    const cost = tokens / 1e3 * 2e-3;
    await publishBuildEvent({
      type: "complete",
      executionId,
      projectId,
      timestamp: Date.now(),
      status: "completed",
      progress: 100,
      totalProgress: 100,
      message: "Build complete",
      currentStage: "deployment",
      metadata: { previewUrl, ...metadata },
      files,
      tokensUsed: tokens,
      durationMs: duration,
      costUsd: cost
    });
    try {
      await redis.expire(`build:stream:${executionId}`, STREAM_TTL_SECONDS);
      await redis.expire(`build:state:${executionId}`, STREAM_TTL_SECONDS);
    } catch {
    }
  },
  /** Emit an agent activity event (appears in the Timeline tab) */
  agent(executionId, agentName, action, message, projectId) {
    return publishBuildEvent({
      type: "agent",
      executionId,
      projectId,
      timestamp: Date.now(),
      agent: agentName,
      action,
      message
    });
  },
  /**
   * Start a duration-tracked agent timer.
   * Emits a 'started' event immediately, returns a done() function that emits
   * a 'finished' event with elapsed time when called.
   *
   * Usage:
   *   const done = await eventBus.startTimer(id, 'DatabaseAgent', 'schema_design', 'Designing schema...');
   *   // ... do work ...
   *   await done('Schema complete');
   */
  async startTimer(executionId, agentName, action, message, projectId) {
    const startedAt = Date.now();
    await publishBuildEvent({
      type: "agent",
      executionId,
      projectId,
      timestamp: startedAt,
      agent: agentName,
      action: `${action}:started`,
      message
    });
    return async (completionMessage) => {
      const durationMs = Date.now() - startedAt;
      await publishBuildEvent({
        type: "agent",
        executionId,
        projectId,
        timestamp: Date.now(),
        agent: agentName,
        action: `${action}:finished`,
        message: completionMessage || message,
        durationMs
      });
    };
  },
  /** Emit a build failure event */
  error(executionId, message, projectId) {
    return publishBuildEvent({
      type: "error",
      executionId,
      projectId,
      timestamp: Date.now(),
      status: "failed",
      message
    });
  },
  /** Read new messages from the stream */
  readBuildEvents
};

// src/services/mission-controller.ts
var MissionController = class {
  PREFIX = "mission:";
  async createMission(mission) {
    const key = `${this.PREFIX}${mission.id}`;
    await redis.setex(key, 86400, JSON.stringify(mission));
    logger_default.info({ missionId: mission.id }, "Mission state initialized in Redis");
    await eventBus.stage(mission.id, mission.status, "in_progress", "Mission initialized", 0, mission.projectId);
  }
  async getMission(missionId) {
    const data = await redis.get(`${this.PREFIX}${missionId}`);
    return data ? JSON.parse(data) : null;
  }
  async atomicUpdate(missionId, mutator) {
    const key = `${this.PREFIX}${missionId}`;
    const existing = await this.getMission(missionId);
    if (!existing) {
      logger_default.warn({ missionId }, "Attempted atomic update on non-existent mission");
      return;
    }
    const updated = await mutator(existing);
    updated.updatedAt = Date.now();
    await redis.setex(key, 86400, JSON.stringify(updated));
    if (updated.status !== existing.status) {
      logger_default.info({ missionId, from: existing.status, to: updated.status }, "[MissionController] Atomic Transition");
      const STATUS_PROGRESS = {
        "init": 5,
        "queued": 10,
        "planning": 15,
        "graph_ready": 25,
        "executing": 45,
        "building": 60,
        "repairing": 70,
        "assembling": 80,
        "deploying": 90,
        "previewing": 95,
        "complete": 100,
        "failed": 0
      };
      await eventBus.stage(
        missionId,
        updated.status,
        updated.status === "complete" ? "completed" : "in_progress",
        `Stage: ${updated.status}`,
        STATUS_PROGRESS[updated.status] || 0,
        updated.projectId
      );
    }
  }
  async updateMission(missionId, update) {
    return this.atomicUpdate(missionId, (existing) => {
      const updated = {
        ...existing,
        ...update,
        metadata: {
          ...existing.metadata,
          ...update.metadata || {}
        }
      };
      if (update.status && update.status !== existing.status) {
        if (!this.validateTransition(existing.status, update.status)) {
          logger_default.error({ missionId, from: existing.status, to: update.status }, "INVALID transition rejected by Pipeline State Guard");
          return existing;
        }
        updated.status = update.status;
      }
      return updated;
    });
  }
  async setFailed(missionId, error) {
    await this.updateMission(missionId, {
      status: "failed",
      metadata: { error }
    });
  }
  async listActiveMissions() {
    const keys = await redis.keys(`${this.PREFIX}*`);
    const missions = [];
    for (const key of keys) {
      const data = await redis.get(key);
      if (data) {
        const mission = JSON.parse(data);
        if (!["completed", "failed"].includes(mission.status)) {
          missions.push(mission);
        }
      }
    }
    return missions;
  }
  validateTransition(current, next) {
    const allowed = {
      "init": ["queued", "planning", "failed"],
      "queued": ["planning", "failed"],
      "planning": ["graph_ready", "failed"],
      "graph_ready": ["executing", "failed"],
      "executing": ["building", "failed"],
      "building": ["repairing", "assembling", "failed"],
      "repairing": ["assembling", "failed"],
      "assembling": ["deploying", "failed"],
      "deploying": ["previewing", "failed"],
      "previewing": ["complete", "failed"],
      "complete": [],
      "failed": ["init"]
    };
    const allowedNext = allowed[current] || [];
    return allowedNext.includes(next);
  }
};
var missionController = new MissionController();

// src/services/state-manager.ts
var ProjectStateManager = class _ProjectStateManager {
  static instance;
  constructor() {
  }
  static getInstance() {
    if (!_ProjectStateManager.instance) {
      _ProjectStateManager.instance = new _ProjectStateManager();
    }
    return _ProjectStateManager.instance;
  }
  /**
   * Atomically transitions the project to a new lifecycle state.
   * Persists to both Redis (real-time) and Supabase (authoritative).
   */
  async transition(executionId, newState, message, progress, projectId, metrics) {
    const timestamp = Date.now();
    const metadata = {
      projectId,
      executionId,
      status: newState,
      message,
      progress,
      tokens: metrics?.tokens,
      duration: metrics?.duration,
      cost: metrics?.cost,
      updatedAt: timestamp
    };
    try {
      await redis.set(`project:state:${executionId}`, JSON.stringify(metadata), "EX", 86400);
      await PersistenceStore.upsertBuild({
        id: executionId,
        project_id: projectId,
        status: "executing",
        // Base status
        current_stage: newState,
        progress_percent: progress,
        message,
        tokens_used: metrics?.tokens,
        duration_ms: metrics?.duration,
        cost_usd: metrics?.cost,
        preview_url: metrics?.previewUrl,
        metadata: { transitionTime: timestamp }
      });
      await PersistenceStore.ensureProject(projectId, "Autonomous Project", "system_level");
      await eventBus.stage(executionId, newState, "in_progress", message, progress, projectId, [], {
        tokens: metrics?.tokens,
        duration: metrics?.duration,
        cost: metrics?.cost
      });
      logger_default.info({ executionId, status: newState, progress }, "[StateManager] Transitioned successfully");
    } catch (error) {
      logger_default.error({ error, executionId, newState }, "[StateManager] Transition failure");
    }
  }
  async getState(executionId) {
    const raw = await redis.get(`project:state:${executionId}`);
    return raw ? JSON.parse(raw) : null;
  }
};
var stateManager = ProjectStateManager.getInstance();

// src/services/orchestrator.ts
var StageState = /* @__PURE__ */ ((StageState2) => {
  StageState2["IDLE"] = "IDLE";
  StageState2["RUNNING"] = "RUNNING";
  StageState2["COMPLETED"] = "COMPLETED";
  StageState2["FAILED"] = "FAILED";
  return StageState2;
})(StageState || {});
var StageStateMachine = class {
  currentStage;
  currentState = "IDLE" /* IDLE */;
  executionId;
  projectId;
  constructor(executionId, projectId) {
    this.executionId = executionId;
    this.projectId = projectId;
    this.currentStage = "PLANNING";
  }
  async transition(stage, state, message, progress) {
    this.currentStage = stage;
    this.currentState = state;
    logger.info({ executionId: this.executionId, stage, state, message }, `[StageStateMachine] Transitioning to ${stage}:${state}`);
    const uiStatus = state === "RUNNING" /* RUNNING */ ? "in_progress" : state === "COMPLETED" /* COMPLETED */ ? "completed" : state === "FAILED" /* FAILED */ ? "failed" : "pending";
    await eventBus.stage(this.executionId, stage.toLowerCase(), uiStatus, message, progress, this.projectId);
  }
  getStage() {
    return this.currentStage;
  }
  getState() {
    return this.currentState;
  }
};
var Orchestrator = class {
  async run(taskPrompt, userId, projectId, executionId, tenantId, _signal, _options) {
    const elog = getExecutionLogger(executionId);
    const fsm = new StageStateMachine(executionId, projectId);
    try {
      elog.info("Dispatching to Temporal Production Pipeline");
      await stateManager.transition(executionId, "created", "Cluster online.", 5, projectId);
      const mission = {
        id: executionId,
        projectId,
        userId,
        prompt: taskPrompt,
        status: "init",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: {}
      };
      await missionController.createMission(mission).catch(() => {
      });
      const { Connection, Client, WorkflowIdReusePolicy } = await import("@temporalio/client");
      const connection3 = await Connection.connect();
      const client = new Client({ connection: connection3 });
      await fsm.transition("PLANNING", "RUNNING" /* RUNNING */, "Orchestrating Temporal mission...", 10);
      const handle = await client.workflow.start("appBuilderWorkflow", {
        args: [{ prompt: taskPrompt, userId, projectId, executionId, tenantId }],
        taskQueue: "app-builder",
        workflowId: `build-${projectId}-${executionId}`,
        workflowIdReusePolicy: WorkflowIdReusePolicy.WORKFLOW_ID_REUSE_POLICY_REJECT_DUPLICATE
      });
      elog.info(`Workflow started. ID: ${handle.workflowId}`);
      const result = await handle.result();
      await fsm.transition("COMPLETE", "COMPLETED" /* COMPLETED */, "Project ready via Temporal!", 100);
      return { success: true, executionId, files: [], previewUrl: result.previewUrl, fastPath: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      elog.error({ error: errorMsg }, "Pipeline failed");
      if (fsm) await fsm.transition("FAILED", "FAILED" /* FAILED */, errorMsg, 0);
      return { success: false, executionId, error: errorMsg };
    }
  }
};

// src/services/project-memory.ts
init_supabase_admin();

// src/services/memory/code-chunker.ts
var CodeChunker = class {
  /**
   * Splits a project's files into semantic chunks suitable for embedding.
   * Currently chunks by file and simple logical boundaries.
   */
  static chunkProject(techStack, files) {
    const chunks = [];
    const techStackString = `${techStack.framework}+${techStack.styling}+${techStack.database}`;
    for (const file of files) {
      chunks.push({
        content: file.content,
        metadata: {
          purpose: file.purpose || this.inferPurpose(file.path),
          tech_stack: techStackString,
          filePath: file.path
        }
      });
    }
    logger_default.info({ chunkCount: chunks.length }, "[CodeChunker] Chunked project files");
    return chunks;
  }
  static inferPurpose(filePath) {
    const fp = filePath.toLowerCase();
    if (fp.includes("page")) return "Page UI";
    if (fp.includes("api/")) return "API Logic";
    if (fp.includes("schema")) return "Database Schema";
    if (fp.includes("components/")) return "UI Component";
    return "Project File";
  }
};

// src/services/memory/embeddings-engine.ts
import axios from "axios";
var EmbeddingsEngine = class {
  static OPENAI_API_URL = "https://api.openai.com/v1/embeddings";
  static MODEL = "text-embedding-3-small";
  /**
   * Generates vector embeddings for a given text string.
   */
  static async generate(text) {
    const apiKey = process.env.OPEN_AI_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      logger_default.warn("[EmbeddingsEngine] OPENAI_API_KEY is missing. Skipping vector generation.");
      return null;
    }
    try {
      const response = await axios.post(
        this.OPENAI_API_URL,
        {
          input: text,
          model: this.MODEL,
          encoding_format: "float"
        },
        {
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          }
        }
      );
      return response.data.data[0].embedding;
    } catch (error) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      logger_default.error({ error: errorMsg }, "[EmbeddingsEngine] Failed to generate embedding");
      return null;
    }
  }
  /**
   * Generates embeddings for multiple chunks in a single batch.
   */
  static async generateBatch(texts) {
    const apiKey = process.env.OPEN_AI_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey || texts.length === 0) return null;
    try {
      const response = await axios.post(
        this.OPENAI_API_URL,
        {
          input: texts,
          model: this.MODEL,
          encoding_format: "float"
        },
        {
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          }
        }
      );
      return response.data.data.map((item) => item.embedding);
    } catch (error) {
      logger_default.error({ error: error.message }, "[EmbeddingsEngine] Batch generation failed");
      return null;
    }
  }
};

// src/services/memory/vector-store.ts
init_supabase_admin();
var VectorStore = class {
  /**
   * Stores code chunks and their embeddings in the Supabase vector store.
   */
  static async upsertChunks(chunks) {
    if (chunks.length === 0) return;
    try {
      const payload = chunks.map((c) => ({
        project_id: c.metadata.projectId,
        file_path: c.metadata.filePath,
        chunk_content: c.content,
        embedding: c.embedding,
        metadata: {
          purpose: c.metadata.purpose,
          tech_stack: c.metadata.tech_stack
        },
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      }));
      const { error } = await supabaseAdmin.from("project_code_embeddings").upsert(payload);
      if (error) throw error;
      logger_default.info({ count: chunks.length }, "[VectorStore] Successfully indexed code chunks");
    } catch (error) {
      logger_default.error({ error }, "[VectorStore] Failed to index chunks");
    }
  }
  /**
   * Performs a semantic search for similar code chunks.
   */
  static async searchSimilarCode(queryEmbedding, techStack, limit = 5) {
    try {
      const { data, error } = await supabaseAdmin.rpc("match_code_chunks", {
        query_embedding: queryEmbedding,
        match_threshold: 0.5,
        match_count: limit,
        tech_stack_filter: techStack || null
      });
      if (error) throw error;
      return data || [];
    } catch (error) {
      logger_default.error({ error }, "[VectorStore] Semantic search failed");
      return [];
    }
  }
  /**
   * Stores a global experience lesson.
   */
  static async upsertExperience(data) {
    try {
      const { error } = await supabaseAdmin.from("global_experience_memory").upsert({
        content: data.content,
        embedding: data.embedding,
        outcome: data.metadata.outcome,
        metadata: data.metadata
      });
      if (error) throw error;
      logger_default.info("[VectorStore] Successfully indexed experience lesson");
    } catch (error) {
      logger_default.error({ error }, "[VectorStore] Failed to index experience");
    }
  }
  /**
   * Performs a semantic search for similar experience lessons.
   */
  static async searchExperience(queryEmbedding, limit = 5) {
    try {
      const { data, error } = await supabaseAdmin.rpc("match_experience", {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: limit
      });
      if (error) throw error;
      return data || [];
    } catch (error) {
      logger_default.error({ error }, "[VectorStore] Experience search failed");
      return [];
    }
  }
};

// src/services/project-memory.ts
import { createHash } from "crypto";
var ProjectMemoryService = class {
  memoryCache = /* @__PURE__ */ new Map();
  async getMemory(projectId) {
    if (this.memoryCache.has(projectId)) {
      return this.memoryCache.get(projectId);
    }
    try {
      const { data, error } = await supabaseAdmin.from("project_memory").select("*").eq("project_id", projectId).single();
      if (error) {
        if (error.message.includes("does not exist") || error.message.includes("schema cache")) {
          this.tableAvailable = false;
          return null;
        }
        return null;
      }
      if (!data) return null;
      const memory = {
        projectId: data.project_id,
        framework: data.framework || "nextjs",
        styling: data.styling || "tailwind",
        backend: data.backend || data.database_type || "api-routes",
        database: data.database_type || data.database || "supabase",
        auth: data.auth || "none",
        features: data.features || [],
        fileManifest: data.file_manifest || [],
        editHistory: data.edit_history || [],
        lastUpdated: data.updated_at
      };
      this.memoryCache.set(projectId, memory);
      this.tableAvailable = true;
      return memory;
    } catch (e) {
      logger_default.error({ projectId, error: e }, "Failed to load project memory");
      return null;
    }
  }
  async initializeMemory(projectId, techStack, files) {
    const manifest = files.map((f) => ({
      path: f.path,
      purpose: this.inferPurpose(f.path),
      agent: this.inferAgent(f.path),
      dependencies: this.extractImports(f.content),
      lastModified: (/* @__PURE__ */ new Date()).toISOString(),
      version: 1
    }));
    const memory = {
      projectId,
      framework: techStack.framework,
      styling: techStack.styling,
      backend: techStack.backend,
      database: techStack.database,
      auth: techStack.auth || "none",
      features: [],
      fileManifest: manifest,
      editHistory: [{
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        action: "create",
        filePath: "*",
        agent: "PlannerAgent",
        reason: "Initial project generation"
      }],
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    };
    await this.persistMemory(memory);
    this.memoryCache.set(projectId, memory);
    try {
      const chunks = CodeChunker.chunkProject(techStack, files);
      const contents = chunks.map((c) => c.content);
      const embeddings = await EmbeddingsEngine.generateBatch(contents);
      if (embeddings) {
        const chunksWithEmbeddings = chunks.map((c, i) => ({
          content: c.content,
          embedding: embeddings[i],
          metadata: { ...c.metadata, projectId }
        }));
        await VectorStore.upsertChunks(chunksWithEmbeddings);
      }
    } catch (e) {
      logger_default.error({ projectId, error: e }, "[ProjectMemory] Failed to index embeddings");
    }
    return memory;
  }
  async recordEdit(projectId, filePath, action, agent, reason, newContent) {
    const memory = await this.getMemory(projectId);
    if (!memory) return;
    const existingEntry = memory.fileManifest.find((f) => f.path === filePath);
    if (action === "delete") {
      memory.fileManifest = memory.fileManifest.filter((f) => f.path !== filePath);
    } else if (existingEntry) {
      existingEntry.version += 1;
      existingEntry.lastModified = (/* @__PURE__ */ new Date()).toISOString();
      existingEntry.agent = agent;
      if (newContent) {
        existingEntry.dependencies = this.extractImports(newContent);
      }
    } else {
      memory.fileManifest.push({
        path: filePath,
        purpose: this.inferPurpose(filePath),
        agent,
        dependencies: newContent ? this.extractImports(newContent) : [],
        lastModified: (/* @__PURE__ */ new Date()).toISOString(),
        version: 1
      });
    }
    memory.editHistory.push({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      action,
      filePath,
      agent,
      reason
    });
    if (memory.editHistory.length > 100) {
      memory.editHistory = memory.editHistory.slice(-100);
    }
    memory.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
    await this.persistMemory(memory);
    this.memoryCache.set(projectId, memory);
    try {
      let cursor = "0";
      do {
        const [nextCursor, keys] = await redis.scan(cursor, "MATCH", "mem:search:*", "COUNT", 100);
        cursor = nextCursor;
        if (keys.length > 0) {
          await redis.del(...keys);
          logger_default.debug({ count: keys.length }, "[ProjectMemory] Invalidated search cache entries");
        }
      } while (cursor !== "0");
    } catch (e) {
      logger_default.warn({ error: e }, "[ProjectMemory] Search cache invalidation failed (non-fatal)");
    }
  }
  async addFeature(projectId, feature) {
    const memory = await this.getMemory(projectId);
    if (!memory) return;
    if (!memory.features.includes(feature)) {
      memory.features.push(feature);
      await this.persistMemory(memory);
      this.memoryCache.set(projectId, memory);
    }
  }
  /**
   * Performs a semantic search across the global code memory.
   * Results are cached in Redis for 5 minutes (TTL = 300s).
   */
  async searchSimilarCode(query, techStack, limit = 5) {
    const cacheKey = `mem:search:${createHash("sha256").update(`${query}:${techStack || ""}`).digest("hex").slice(0, 24)}`;
    const CACHE_TTL = 300;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        logger_default.debug({ cacheKey }, "[ProjectMemory] Cache HIT for semantic search");
        return JSON.parse(cached);
      }
    } catch (cacheErr) {
      logger_default.warn({ cacheErr }, "[ProjectMemory] Redis cache read failed, falling through");
    }
    const embedding = await EmbeddingsEngine.generate(query);
    if (!embedding) return [];
    const results = await VectorStore.searchSimilarCode(embedding, techStack, limit);
    try {
      await redis.set(cacheKey, JSON.stringify(results), "EX", CACHE_TTL);
    } catch (cacheErr) {
      logger_default.warn({ cacheErr }, "[ProjectMemory] Redis cache write failed");
    }
    return results;
  }
  /**
   * Given a user's edit request, determine which files need modification.
   * This is the core intelligence that prevents blind regeneration.
   */
  async getAffectedFiles(memory, editRequest) {
    const request = editRequest.toLowerCase();
    const affected = [];
    try {
      const similarChunks = await this.searchSimilarCode(editRequest, memory.framework);
      for (const chunk of similarChunks) {
        affected.push(chunk.file_path);
      }
    } catch (e) {
      logger_default.warn({ error: e }, "[ProjectMemory] Semantic search failed during impact analysis");
    }
    for (const file of memory.fileManifest) {
      const fp = file.path.toLowerCase();
      const purpose = file.purpose.toLowerCase();
      if (request.includes("dark mode") || request.includes("theme")) {
        if (fp.includes("tailwind") || fp.includes("globals.css") || fp.includes("layout") || fp.includes("theme")) {
          affected.push(file.path);
        }
      }
      if (request.includes("auth") || request.includes("login") || request.includes("signup")) {
        if (fp.includes("auth") || fp.includes("login") || fp.includes("signup") || fp.includes("middleware") || purpose.includes("auth")) {
          affected.push(file.path);
        }
      }
      if (request.includes("dashboard")) {
        if (fp.includes("dashboard") || fp.includes("layout")) {
          affected.push(file.path);
        }
      }
      if (request.includes("database") || request.includes("schema")) {
        if (fp.includes("schema") || fp.includes("migration") || fp.includes("prisma") || purpose.includes("database")) {
          affected.push(file.path);
        }
      }
      if (request.includes("api") || request.includes("endpoint")) {
        if (fp.includes("api/") || fp.includes("route")) {
          affected.push(file.path);
        }
      }
      if (request.includes("page") || request.includes("component")) {
        if (fp.includes("page.tsx") || fp.includes("components/")) {
          affected.push(file.path);
        }
      }
      if (request.includes("style") || request.includes("css") || request.includes("design")) {
        if (fp.includes(".css") || fp.includes("tailwind") || fp.includes("globals")) {
          affected.push(file.path);
        }
      }
    }
    return [...new Set(affected)];
  }
  /**
   * Build a context summary string for the AI agent, so it knows the project state
   */
  buildContextSummary(memory) {
    return `PROJECT CONTEXT:
Framework: ${memory.framework}
Styling: ${memory.styling}
Backend: ${memory.backend}
Database: ${memory.database}
Auth: ${memory.auth}
Features: ${memory.features.join(", ") || "none yet"}
Total Files: ${memory.fileManifest.length}
Recent Edits: ${memory.editHistory.slice(-5).map((e) => `${e.action} ${e.filePath} (${e.reason})`).join(" | ")}
File Map: ${memory.fileManifest.map((f) => `${f.path} [${f.purpose}]`).join(", ")}`;
  }
  // â”€â”€ Private Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  tableAvailable = null;
  // null = not yet checked
  async persistMemory(memory) {
    if (this.tableAvailable === false) return;
    try {
      const payload = {
        project_id: memory.projectId,
        framework: memory.framework,
        styling: memory.styling,
        backend: memory.backend,
        database_type: memory.database,
        auth: memory.auth,
        features: memory.features,
        file_manifest: memory.fileManifest,
        edit_history: memory.editHistory,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      const { error } = await supabaseAdmin.from("project_memory").upsert(payload, { onConflict: "project_id" });
      if (error) {
        if (error.message.includes("does not exist") || error.message.includes("schema cache")) {
          logger_default.warn({ projectId: memory.projectId }, "project_memory table not found. Using in-memory only. Run migration 004_project_memory.sql to enable persistence.");
          this.tableAvailable = false;
          return;
        }
        throw error;
      }
      this.tableAvailable = true;
    } catch (e) {
      logger_default.error({ projectId: memory.projectId, error: e }, "Failed to persist project memory");
    }
  }
  inferPurpose(filePath) {
    const fp = filePath.toLowerCase();
    if (fp.includes("page.tsx") || fp.includes("page.jsx")) return "Page component";
    if (fp.includes("layout")) return "Layout wrapper";
    if (fp.includes("api/")) return "API route";
    if (fp.includes("components/")) return "UI component";
    if (fp.includes("schema") || fp.includes("migration")) return "Database schema";
    if (fp.includes("middleware")) return "Middleware";
    if (fp.includes("globals.css")) return "Global styles";
    if (fp.includes("tailwind")) return "Tailwind configuration";
    if (fp.includes("package.json")) return "Package manifest";
    if (fp.includes("next.config")) return "Next.js configuration";
    if (fp.includes(".test.") || fp.includes(".spec.")) return "Test file";
    if (fp.includes("docker")) return "Docker configuration";
    if (fp.includes("lib/") || fp.includes("utils/")) return "Utility/library";
    if (fp.includes("hooks/")) return "React hook";
    if (fp.includes("context/") || fp.includes("provider")) return "Context provider";
    return "Project file";
  }
  inferAgent(filePath) {
    const fp = filePath.toLowerCase();
    if (fp.includes("schema") || fp.includes("migration") || fp.includes("seed")) return "DatabaseAgent";
    if (fp.includes("api/") || fp.includes("middleware") || fp.includes("lib/")) return "BackendAgent";
    if (fp.includes("page") || fp.includes("component") || fp.includes("layout") || fp.includes(".css")) return "FrontendAgent";
    if (fp.includes("docker") || fp.includes("ci") || fp.includes("deploy")) return "DeploymentAgent";
    if (fp.includes("test") || fp.includes("spec")) return "TestingAgent";
    return "FrontendAgent";
  }
  extractImports(content) {
    const imports = [];
    const importRegex = /(?:import|require)\s*(?:\(?\s*['"]([^'"]+)['"]\s*\)?|.*from\s+['"]([^'"]+)['"])/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1] || match[2];
      if (importPath && !importPath.startsWith("react") && !importPath.startsWith("next")) {
        imports.push(importPath);
      }
    }
    return imports;
  }
};
var projectMemory = new ProjectMemoryService();

// src/services/memory-plane.ts
var MemoryPlane = class {
  /**
   * Gets a 360-degree context for an agent based on a specific prompt/task.
   */
  async getRelevantContext(projectId, task) {
    const memory = await projectMemory.getMemory(projectId);
    if (!memory) return "No project context available.";
    logger_default.info({ projectId, task }, "[MemoryPlane] Retrieving multi-dimensional context");
    const similarCode = await projectMemory.searchSimilarCode(task, memory.framework);
    const codeSnips = similarCode.map((c) => `File: ${c.file_path}
Content Snippet: ${c.chunk_content.substring(0, 500)}...`).join("\n\n");
    const lessons = await this.searchExperience(task);
    const lessonSnips = lessons.map((l) => `- [${l.outcome.toUpperCase()}] ${l.lesson}`).join("\n");
    const archSummary = projectMemory.buildContextSummary(memory);
    return `
--- SYSTEM MEMORY: PROJECT ARCHITECTURE ---
${archSummary}

--- SYSTEM MEMORY: RELEVANT CODE SNIPPETS ---
${codeSnips || "No similar code found."}

--- SYSTEM MEMORY: PAST LESSONS & PATTERNS ---
${lessonSnips || "No previous experience found for this pattern."}
        `.trim();
  }
  /**
   * Records a "lesson learned" from an execution cycle into the global experience store.
   */
  async recordLesson(projectId, lesson) {
    logger_default.info({ projectId, outcome: lesson.outcome }, "[MemoryPlane] Recording experience lesson");
    try {
      const embedding = await EmbeddingsEngine.generate(`${lesson.action} ${lesson.lesson}`);
      if (embedding) {
        await VectorStore.upsertExperience({
          content: `${lesson.action} -> ${lesson.lesson}`,
          embedding,
          metadata: {
            projectId,
            outcome: lesson.outcome,
            type: "lesson",
            context: lesson.context
          }
        });
      }
    } catch (e) {
      logger_default.error({ error: e }, "[MemoryPlane] Failed to record lesson");
    }
  }
  async searchExperience(query, limit = 3) {
    const embedding = await EmbeddingsEngine.generate(query);
    if (!embedding) return [];
    return VectorStore.searchExperience(embedding, limit);
  }
};
var memoryPlane = new MemoryPlane();

// src/services/semantic-cache.ts
import crypto from "crypto";
var SemanticCacheService = class {
  static PREFIX = "cache:llm:";
  static TTL = 60 * 60 * 24 * 7;
  // 7-day TTL for optimization
  /**
   * Normalizes and hashes the input to create a deterministic cache key.
   */
  static generateKey(prompt, system, model) {
    const payload = JSON.stringify({
      prompt: prompt.trim(),
      system: system?.trim() || "",
      model: model || "default"
    });
    const hash = crypto.createHash("sha256").update(payload).digest("hex");
    return `${this.PREFIX}${hash}`;
  }
  /**
   * Attempt to retrieve a cached LLM response.
   */
  static async get(prompt, system, model) {
    const key = this.generateKey(prompt, system, model);
    try {
      const cached = await redis.get(key);
      if (cached) {
        logger_default.info({ key }, "[SemanticCache] Hit - skipping LLM invocation");
        return JSON.parse(cached);
      }
    } catch (error) {
      logger_default.error({ error, key }, "[SemanticCache] Get failed");
    }
    return null;
  }
  /**
   * Persists an LLM response to the semantic cache.
   */
  static async set(prompt, response, system, model) {
    const key = this.generateKey(prompt, system, model);
    try {
      await redis.set(key, JSON.stringify(response), "EX", this.TTL);
      logger_default.info({ key }, "[SemanticCache] Response cached");
    } catch (error) {
      logger_default.error({ error, key }, "[SemanticCache] Set failed");
    }
  }
  /**
   * Manually invalidates a cache entry if needed (e.g., feedback loop correction).
   */
  static async invalidate(prompt, system, model) {
    const key = this.generateKey(prompt, system, model);
    await redis.del(key);
  }
};

// src/config/governance.ts
var PLAN_LIMITS = {
  free: {
    maxDailyGenerations: 3,
    maxMonthlyTokens: 5e5,
    concurrency: 1,
    maxCostPerBuild: 0.05
    // $0.05
  },
  pro: {
    maxDailyGenerations: 50,
    maxMonthlyTokens: 1e7,
    concurrency: 5,
    maxCostPerBuild: 0.25
    // $0.25
  },
  scale: {
    maxDailyGenerations: 200,
    maxMonthlyTokens: 5e7,
    concurrency: 20,
    maxCostPerBuild: 1
    // $1.00
  },
  owner: {
    maxDailyGenerations: 1e3,
    maxMonthlyTokens: 1e8,
    concurrency: 100,
    maxCostPerBuild: 5
    // $5.00
  }
};
var DEFAULT_GOVERNANCE_CONFIG = {
  maxDailyGenerations: PLAN_LIMITS.free.maxDailyGenerations,
  maxMonthlyTokens: PLAN_LIMITS.free.maxMonthlyTokens
};
var COST_PER_1M_TOKENS = {
  groq: 0.1,
  // $0.10 / 1M tokens (Llama 3/3.1)
  openai: 2.5,
  // $2.50 / 1M tokens (GPT-4o)
  anthropic: 3
  // $3.00 / 1M tokens (Claude 3.5 Sonnet)
};
var CostGovernanceService = class {
  /**
   * Audits an owner override event and persists it to the database.
   */
  static async auditOwnerOverride(userId, executionId, tokensUsed = 0, buildDuration = 0) {
    logger_default.info({ event: "owner_override", userId, executionId, tokensUsed }, "OWNER OVERRIDE ACTIVE - Bypassing limits securely");
    try {
      const { getSupabaseAdmin: getSupabaseAdmin2 } = await Promise.resolve().then(() => (init_supabase_admin(), supabase_admin_exports));
      const supabaseAdmin2 = getSupabaseAdmin2();
      if (supabaseAdmin2) {
        await supabaseAdmin2.from("audit_owner_override_logs").insert([{
          user_id: userId,
          execution_id: executionId,
          tokens_used: tokensUsed,
          build_duration_sec: buildDuration,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }]);
      }
    } catch (error) {
      logger_default.error({ error, userId, executionId }, "Failed to write audit_owner_override_logs");
    }
  }
  /**
   * Checks if the global emergency kill switch is activated in Redis.
   * Use `redis.set('system:kill_switch', 'true')` to halt all orchestration.
   */
  static async isKillSwitchActive(config) {
    const isDev = process.env.NODE_ENV === "development";
    if (isDev) {
      logger_default.info("Development Mode Bypass: Skipping kill switch check.");
      return false;
    }
    if (config?.governanceBypass && config?.userId && config?.executionId) {
      await this.auditOwnerOverride(config.userId, config.executionId);
      return false;
    }
    try {
      const isKilled = await redis.get("system:kill_switch");
      return isKilled === "true";
    } catch (error) {
      logger_default.error({ error }, "Failed to check global kill switch");
      return false;
    }
  }
  /**
   * Checks if a user can execute a generation job based on their daily limits from Supabase.
   */
  static async checkAndIncrementExecutionLimit(userId) {
    logger_default.info({ userId }, "TEMPORARY BYPASS: Skipping execution limit check completely.");
    return { allowed: true, currentCount: 0 };
  }
  /**
   * Checks if a user has exceeded their monthly allocated token budget.
   */
  static async checkTokenLimit(userId, config = DEFAULT_GOVERNANCE_CONFIG) {
    const isDev = process.env.NODE_ENV === "development";
    const month = (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
    const key = `governance:tokens:${userId}:${month}`;
    if (isDev) {
      logger_default.info({ userId }, "Development Mode Bypass: Skipping token limit check.");
      const usedStr = await redis.get(key);
      return { allowed: true, usedTokens: usedStr ? parseInt(usedStr, 10) : 0 };
    }
    if (config.governanceBypass && config.executionId) {
      const usedStr = await redis.get(key);
      return { allowed: true, usedTokens: usedStr ? parseInt(usedStr, 10) : 0 };
    }
    try {
      const usedStr = await redis.get(key);
      const usedTokens = usedStr ? parseInt(usedStr, 10) : 0;
      if (usedTokens >= config.maxMonthlyTokens) {
        logger_default.warn({ userId, usedTokens, limit: config.maxMonthlyTokens }, "User exceeded monthly token budget");
        return { allowed: false, usedTokens };
      }
      return { allowed: true, usedTokens };
    } catch (error) {
      logger_default.error({ error, userId }, "Failed to check token limits");
      throw new Error("Failed to validate token budget.");
    }
  }
  /**
   * Increments the user's monthly token usage. Called by the Orchestrator post-generation.
   * Records to both Redis (real-time enforcement) and Supabase (persistent audit log).
   */
  static async recordTokenUsage(userId, tokensUsed, executionId) {
    if (!tokensUsed || tokensUsed <= 0) return;
    const month = (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
    const key = `governance:tokens:${userId}:${month}`;
    try {
      await redis.multi().incrby(key, tokensUsed).expire(key, 32 * 24 * 60 * 60).exec();
      const { getSupabaseAdmin: getSupabaseAdmin2 } = await Promise.resolve().then(() => (init_supabase_admin(), supabase_admin_exports));
      const supabaseAdmin2 = getSupabaseAdmin2();
      if (!supabaseAdmin2) throw new Error("Supabase admin not initialized");
      const { error } = await supabaseAdmin2.from("token_billing_logs").insert([{
        user_id: userId,
        execution_id: executionId,
        tokens_used: tokensUsed,
        recorded_at: (/* @__PURE__ */ new Date()).toISOString()
      }]);
      if (error) throw error;
      logger_default.info({ userId, tokensUsed, executionId }, "Recorded token usage to Redis and DB");
      const provider = "groq";
      const cost = tokensUsed / 1e6 * (COST_PER_1M_TOKENS[provider] || 0.1);
      if (cost > 0) {
        await supabaseAdmin2.rpc("increment_user_cost", {
          user_id_param: userId,
          cost_param: parseFloat(cost.toFixed(4))
        });
        await supabaseAdmin2.from("execution_costs").insert([{
          user_id: userId,
          execution_id: executionId,
          tokens_used: tokensUsed,
          cost_usd: cost,
          provider,
          recorded_at: (/* @__PURE__ */ new Date()).toISOString()
        }]);
        logger_default.info({ userId, cost, provider }, "Recorded execution cost");
      }
    } catch (error) {
      logger_default.error({ error, userId, tokensUsed, executionId }, "CRITICAL: Failed to record token usage to billing layers.");
    }
  }
  /**
   * Calculates the USD cost for a given number of tokens and provider.
   */
  static calculateExecutionCost(tokens, provider = "groq") {
    const rate = COST_PER_1M_TOKENS[provider] || 0.1;
    return tokens / 1e6 * rate;
  }
  /**
   * Checks if the current execution cost exceeds the plan's threshold.
   */
  static async checkCostSafeguard(userId, tokensUsed) {
    try {
      const { getSupabaseAdmin: getSupabaseAdmin2 } = await Promise.resolve().then(() => (init_supabase_admin(), supabase_admin_exports));
      const supabaseAdmin2 = getSupabaseAdmin2();
      if (!supabaseAdmin2) throw new Error("Supabase admin not initialized");
      const { data: profile } = await supabaseAdmin2.from("user_profiles").select("plan_type, role").eq("id", userId).single();
      const plan = profile?.role === "owner" ? "owner" : profile?.plan_type || "free";
      const limit = PLAN_LIMITS[plan].maxCostPerBuild;
      const currentCost = this.calculateExecutionCost(tokensUsed);
      if (currentCost > limit) {
        logger_default.warn({ userId, currentCost, limit, plan }, "Build cost safeguard triggered - threshold exceeded");
        return { allowed: false, cost: currentCost, limit };
      }
      return { allowed: true, cost: currentCost, limit };
    } catch (error) {
      logger_default.error({ error, userId }, "Failed to check cost safeguard");
      return { allowed: true, cost: 0, limit: 0 };
    }
  }
  /**
   * Restores a crashed execution ticket (decrements daily count).
   */
  static async refundExecution(userId) {
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const key = `governance:executions:${userId}:${today}`;
    try {
      await redis.decr(key);
    } catch (error) {
      logger_default.error({ error, userId }, "Failed to refund execution limit ticket");
    }
  }
};

// src/config/index.ts
var config_exports = {};
__export(config_exports, {
  BUILD_MODE: () => BUILD_MODE,
  COST_PER_1M_TOKENS: () => COST_PER_1M_TOKENS,
  CircuitBreaker: () => CircuitBreaker,
  CircuitState: () => CircuitState,
  CostGovernanceService: () => CostGovernanceService,
  DEFAULT_GOVERNANCE_CONFIG: () => DEFAULT_GOVERNANCE_CONFIG,
  IS_PRODUCTION: () => IS_PRODUCTION,
  OrchestratorLock: () => OrchestratorLock,
  PLAN_LIMITS: () => PLAN_LIMITS,
  ProjectGenerationSchema: () => ProjectGenerationSchema,
  RateLimiter: () => RateLimiter,
  STRIPE_CONFIG: () => STRIPE_CONFIG,
  StripeWebhookSchema: () => StripeWebhookSchema,
  UserProfileSchema: () => UserProfileSchema,
  activeBuildsGauge: () => activeBuildsGauge,
  agentExecutionDuration: () => agentExecutionDuration,
  agentFailuresTotal: () => agentFailuresTotal,
  apiRequestDurationSeconds: () => apiRequestDurationSeconds,
  breakers: () => breakers,
  cn: () => cn,
  createPortalSession: () => createPortalSession,
  env: () => env,
  executionFailureTotal: () => executionFailureTotal,
  executionSuccessTotal: () => executionSuccessTotal,
  formatDate: () => formatDate,
  formatRelative: () => formatRelative,
  formatTime: () => formatTime,
  formatYear: () => formatYear,
  getCorrelationId: () => getCorrelationId,
  getExecutionLogger: () => getExecutionLogger,
  lockExpiredTotal: () => lockExpiredTotal,
  lockExtensionTotal: () => lockExtensionTotal,
  logger: () => logger,
  nodeCpuUsage: () => nodeCpuUsage,
  nodeMemoryUsage: () => nodeMemoryUsage,
  pusher: () => pusher,
  queueLengthGauge: () => queueLengthGauge,
  queueWaitTimeSeconds: () => queueWaitTimeSeconds,
  recordBuildMetrics: () => recordBuildMetrics,
  registry: () => registry,
  retryCountTotal: () => retryCountTotal,
  runWithTracing: () => runWithTracing,
  runtimeActiveTotal: () => runtimeActiveTotal,
  runtimeCrashesTotal: () => runtimeCrashesTotal,
  runtimeEvictionsTotal: () => runtimeEvictionsTotal,
  runtimeProxyErrorsTotal: () => runtimeProxyErrorsTotal,
  runtimeStartupDuration: () => runtimeStartupDuration,
  sendBuildSuccessEmail: () => sendBuildSuccessEmail,
  stripe: () => stripe,
  stripeWebhookEventsTotal: () => stripeWebhookEventsTotal,
  stuckBuildsTotal: () => stuckBuildsTotal,
  tracingContext: () => tracingContext,
  useStream: () => useStream,
  withLock: () => withLock,
  workerTaskDurationSeconds: () => workerTaskDurationSeconds
});

// src/config/billing.ts
import Stripe from "stripe";
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is missing from environment variables");
}
var stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
  // Compatible with Stripe 14.x
  appInfo: {
    name: "MultiAgent Platform",
    version: "1.0.0"
  }
});
var STRIPE_CONFIG = {
  plans: {
    pro: process.env.STRIPE_PRO_PLAN_ID || (process.env.NODE_ENV === "production" ? "" : "price_pro_default"),
    scale: process.env.STRIPE_SCALE_PLAN_ID || (process.env.NODE_ENV === "production" ? "" : "price_scale_default")
  },
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
};
async function createPortalSession(customerId, returnUrl) {
  return await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl
  });
}

// src/config/build-mode.ts
var BUILD_MODE = process.env.BUILD_MODE || "dev";
var IS_PRODUCTION = BUILD_MODE === "production";

// src/config/circuit-breaker.ts
var CircuitState = /* @__PURE__ */ ((CircuitState2) => {
  CircuitState2[CircuitState2["CLOSED"] = 0] = "CLOSED";
  CircuitState2[CircuitState2["OPEN"] = 1] = "OPEN";
  CircuitState2[CircuitState2["HALF_OPEN"] = 2] = "HALF_OPEN";
  return CircuitState2;
})(CircuitState || {});
var CircuitBreaker = class {
  state = 0 /* CLOSED */;
  failureThreshold;
  resetTimeoutMs;
  failureCount = 0;
  lastFailureTime;
  constructor(failureThreshold = 5, resetTimeoutMs = 3e4) {
    this.failureThreshold = failureThreshold;
    this.resetTimeoutMs = resetTimeoutMs;
  }
  async execute(action) {
    if (this.state === 1 /* OPEN */) {
      if (Date.now() - (this.lastFailureTime || 0) > this.resetTimeoutMs) {
        this.state = 2 /* HALF_OPEN */;
        logger_default.info("Circuit breaker entering HALF_OPEN state");
      } else {
        throw new Error("Circuit Breaker is OPEN. External service unavailable.");
      }
    }
    try {
      const result = await action();
      this.handleSuccess();
      return result;
    } catch (error) {
      this.handleFailure();
      throw error;
    }
  }
  handleSuccess() {
    this.failureCount = 0;
    this.state = 0 /* CLOSED */;
  }
  handleFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.failureThreshold) {
      this.state = 1 /* OPEN */;
      logger_default.error({ failureCount: this.failureCount }, "Circuit breaker is now OPEN");
    }
  }
  getState() {
    return this.state;
  }
};
var breakers = {
  llm: new CircuitBreaker(10, 6e4)
  // Balanced threshold with retries
};

// src/config/date.ts
function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}
function formatTime(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[1].split(".")[0];
}
function formatYear(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.getUTCFullYear().toString();
}
function formatRelative(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const now = /* @__PURE__ */ new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1e3);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toISOString().split("T")[0];
}

// src/config/email.ts
init_supabase_admin();
async function sendBuildSuccessEmail(userId, projectId, executionId, previewUrl) {
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (error || !user?.email) {
      logger_default.error({ error, userId }, "Failed to fetch user email for notification");
      return false;
    }
    const email = user.email;
    logger_default.info(
      { email, projectId, executionId, previewUrl },
      '\xF0\u0178\u201C\xA7 MOCK EMAIL DISPATCHED: "Your MultiAgent Build is Complete!"'
    );
    return true;
  } catch (err) {
    logger_default.error({ err, userId }, "Unhandled error sending build success email");
    return false;
  }
}

// src/config/env.ts
import dotenv from "dotenv";
import path2 from "path";
import fs2 from "fs";
var nodeEnv = process.env.NODE_ENV || "development";
var envFile = nodeEnv === "production" ? ".env.production" : ".env.development";
var envPath = path2.resolve(process.cwd(), envFile);
var envLocalPath = path2.resolve(process.cwd(), ".env.local");
if (fs2.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}
if (fs2.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: true });
}
dotenv.config();
var requiredEnvVars = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "GROQ_API_KEY"
];
var env = {
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NODE_ENV: process.env.NODE_ENV || "development",
  WORKER_CONCURRENCY_FREE: Number(process.env.WORKER_CONCURRENCY_FREE) || 10,
  WORKER_CONCURRENCY_PRO: Number(process.env.WORKER_CONCURRENCY_PRO) || 20,
  WORKER_POOL_SIZE: Number(process.env.WORKER_POOL_SIZE) || 3,
  REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379"
};
var isProd = env.NODE_ENV === "production";
var missingVars = requiredEnvVars.filter((v) => !process.env[v]);
if (missingVars.length > 0) {
  const errorMsg = `CRITICAL: Missing required environment variables: ${missingVars.join(", ")}`;
  if (isProd) {
    throw new Error(errorMsg);
  } else {
    console.warn("==========================================");
    console.warn(errorMsg);
    console.warn("Please check your .env.local file.");
    console.warn("==========================================");
  }
}

// src/config/lock.ts
import Redlock from "redlock";
var redlock = new Redlock(
  // Provide multiple independent clients for high availability (Minimum 3 for strict distributed safety)
  independentRedisClients,
  {
    // The expected clock drift; for more check http://redis.io/topics/distlock
    driftFactor: 0.01,
    // time in ms
    // The max number of times Redlock will attempt to lock a resource
    // before erroring.
    retryCount: 10,
    // the time in ms between attempts
    retryDelay: 200,
    // time in ms
    // the max time in ms randomly added to retries
    // to improve performance under high contention
    // see https://www.iana.org/assignments/iana-p-parameters/iana-p-parameters.xhtml
    retryJitter: 200,
    // time in ms
    // The minimum remaining time on a lock before a renewal is attempted.
    automaticExtensionThreshold: 500
    // time in ms
  }
);
redlock.on("error", (error) => {
  if (error && typeof error === "object" && ("name" in error || "message" in error)) {
    const err = error;
    if (err.name === "ExecutionError" || err.message?.includes("locked")) {
      return;
    }
  }
  logger_default.error({ error }, "Redlock error");
});
async function withLock(executionId, fn, ttl = 3e4) {
  const resource = `locks:execution:${executionId}`;
  logger_default.info({ executionId, resource }, "Attempting to acquire distributed lock");
  const lock = await redlock.acquire([resource], ttl);
  try {
    logger_default.info({ executionId, resource }, "Distributed lock acquired");
    return await fn();
  } finally {
    logger_default.info({ executionId, resource }, "Releasing distributed lock");
    await lock.release();
  }
}

// src/config/metrics.ts
import { Registry, Histogram, Counter, Gauge } from "prom-client";
var registry = new Registry();
registry.setDefaultLabels({
  environment: process.env.NODE_ENV || "production",
  region: process.env.NODE_REGION || "default"
});
var runtimeStartupDuration = new Histogram({
  name: "runtime_startup_duration_seconds",
  help: "Latency in seconds for a preview runtime to become healthy",
  labelNames: ["project_id", "mode"],
  buckets: [1, 2, 5, 10, 20, 30, 60],
  // Max 60s
  registers: [registry]
});
var runtimeCrashesTotal = new Counter({
  name: "runtime_crashes_total",
  help: "Total number of runtime crashes or failures",
  labelNames: ["reason", "mode"],
  registers: [registry]
});
var runtimeActiveTotal = new (registry.getSingleMetric("runtime_active_total") || __require("prom-client").Gauge)({
  name: "runtime_active_total",
  help: "Total number of active preview runtimes on this node",
  registers: [registry]
});
var runtimeEvictionsTotal = new Counter({
  name: "runtime_evictions_total",
  help: "Total number of runtimes evicted for stale/idle reasons",
  labelNames: ["reason"],
  registers: [registry]
});
var nodeCpuUsage = new (registry.getSingleMetric("node_cpu_usage_ratio") || __require("prom-client").Gauge)({
  name: "node_cpu_usage_ratio",
  help: "CPU usage of the current node (0.0 - 1.0)",
  registers: [registry]
});
var nodeMemoryUsage = new (registry.getSingleMetric("node_memory_usage_bytes") || __require("prom-client").Gauge)({
  name: "node_memory_usage_bytes",
  help: "Memory usage of the current node in bytes",
  registers: [registry]
});
var runtimeProxyErrorsTotal = new Counter({
  name: "runtime_proxy_errors_total",
  help: "Total number of reverse proxy failures",
  registers: [registry]
});
var agentExecutionDuration = new Histogram({
  name: "agent_execution_duration_seconds",
  help: "Duration of agent execution in seconds",
  labelNames: ["agent_name", "status"],
  buckets: [1, 5, 10, 30, 60, 120, 300],
  // buckets in seconds
  registers: [registry]
});
var agentFailuresTotal = new Counter({
  name: "agent_failures_total",
  help: "Total number of agent failures",
  labelNames: ["agent_name"],
  registers: [registry]
});
var retryCountTotal = new Counter({
  name: "retry_count_total",
  help: "Total number of agent retries",
  labelNames: ["agent_name"],
  registers: [registry]
});
var executionSuccessTotal = new Counter({
  name: "execution_success_total",
  help: "Total number of successful project generations",
  registers: [registry]
});
var executionFailureTotal = new Counter({
  name: "execution_failure_total",
  help: "Total number of failed project generations",
  registers: [registry]
});
var stuckBuildsTotal = new Counter({
  name: "stuck_builds_total",
  help: "Total number of stuck builds detected and resumed",
  registers: [registry]
});
var queueWaitTimeSeconds = new Histogram({
  name: "queue_wait_time_seconds",
  help: "Time a job waits in queue before being picked up",
  labelNames: ["queue_name"],
  buckets: [0.1, 0.5, 1, 5, 10, 30],
  registers: [registry]
});
var activeBuildsGauge = new Gauge({
  name: "active_builds_total",
  help: "Total number of active builds currently being processed by workers",
  labelNames: ["tier"],
  registers: [registry]
});
var queueLengthGauge = new Gauge({
  name: "queue_length_total",
  help: "Current number of jobs waiting in the queue",
  labelNames: ["queue_name"],
  registers: [registry]
});
var lockExtensionTotal = new Counter({
  name: "lock_extension_total",
  help: "Total number of BullMQ lock extensions",
  registers: [registry]
});
var lockExpiredTotal = new Counter({
  name: "lock_expired_total",
  help: "Total number of BullMQ lock expirations detected",
  registers: [registry]
});
var apiRequestDurationSeconds = new Histogram({
  name: "api_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  registers: [registry]
});
var workerTaskDurationSeconds = new Histogram({
  name: "worker_task_duration_seconds",
  help: "Duration of worker task execution in seconds",
  labelNames: ["queue_name", "status"],
  buckets: [1, 5, 10, 30, 60, 120, 300, 600],
  registers: [registry]
});
var stripeWebhookEventsTotal = new Counter({
  name: "stripe_webhook_events_total",
  help: "Total number of stripe webhook events received",
  labelNames: ["event_type"],
  registers: [registry]
});
async function recordBuildMetrics(status, durationMs, planType = "free", tokensUsed = 0, costUsd = 0) {
  try {
    const pipeline = redis_default.pipeline();
    pipeline.incr("metrics:builds:total");
    if (status === "failed") {
      pipeline.incr("metrics:builds:failed");
    } else if (status === "success") {
      pipeline.incr("metrics:builds:success");
    }
    pipeline.incrby("metrics:builds:duration_sum", Math.round(durationMs));
    pipeline.incrby("metrics:tokens:total", tokensUsed);
    pipeline.incrbyfloat("metrics:builds:cost_sum", costUsd);
    pipeline.incr(`metrics:builds:${planType}:total`);
    if (status === "failed") {
      pipeline.incr(`metrics:builds:${planType}:failed`);
    } else if (status === "success") {
      pipeline.incr(`metrics:builds:${planType}:success`);
    }
    pipeline.incrby(`metrics:builds:${planType}:duration_sum`, Math.round(durationMs));
    pipeline.incrby(`metrics:tokens:${planType}:total`, tokensUsed);
    pipeline.incrbyfloat(`metrics:builds:${planType}:cost_sum`, costUsd);
    await pipeline.exec();
  } catch {
  }
}
logger_default.info("Prometheus metrics initialized");

// src/config/orchestrator-lock.ts
import { v4 as uuidv42 } from "uuid";
var OrchestratorLock = class {
  workerId;
  executionId;
  lockKey;
  isOwned = false;
  renewalTimer = null;
  ttlSeconds;
  abortController;
  constructor(executionId, ttlSeconds = 60) {
    this.workerId = `worker-${uuidv42()}`;
    this.executionId = executionId;
    this.lockKey = `lock:execution:${executionId}`;
    this.ttlSeconds = ttlSeconds;
    this.abortController = new AbortController();
  }
  getWorkerId() {
    return this.workerId;
  }
  getLockKey() {
    return this.lockKey;
  }
  getAbortSignal() {
    return this.abortController.signal;
  }
  /**
   * Attempts to acquire the lock. Returns true if successful.
   */
  async acquire() {
    const acquired = await redis_default.set(this.lockKey, this.workerId, "EX", this.ttlSeconds, "NX");
    if (acquired === "OK") {
      this.isOwned = true;
      this.startRenewal();
      logger_default.info({ executionId: this.executionId, workerId: this.workerId }, "Acquired exclusive execution lock");
      return true;
    }
    const currentOwner = await redis_default.get(this.lockKey);
    if (currentOwner === this.workerId) {
      this.isOwned = true;
      this.startRenewal();
      return true;
    }
    return false;
  }
  /**
   * Re-acquires an existing lock if we know the workerId
   */
  async forceAcquire() {
    await redis_default.set(this.lockKey, this.workerId, "EX", this.ttlSeconds);
    this.isOwned = true;
    this.startRenewal();
    logger_default.info({ executionId: this.executionId, workerId: this.workerId }, "Force-acquired execution lock");
  }
  /**
   * Starts the heartbeat renewal loop
   */
  startRenewal() {
    if (this.renewalTimer) clearInterval(this.renewalTimer);
    this.renewalTimer = setInterval(async () => {
      try {
        const script = `
                    if redis.call("get", KEYS[1]) == ARGV[1] then
                        return redis.call("expire", KEYS[1], ARGV[2])
                    else
                        return 0
                    end
                `;
        const result = await redis_default.eval(script, 1, this.lockKey, this.workerId, this.ttlSeconds);
        if (result === 0) {
          logger_default.fatal({ executionId: this.executionId, workerId: this.workerId }, "Lock stolen or expired! Aborting execution.");
          this.isOwned = false;
          this.abortController.abort();
          this.stopRenewal();
        }
      } catch (err) {
        logger_default.error({ err, executionId: this.executionId }, "Failed to renew lock");
      }
    }, 3e3);
  }
  /**
   * Synchronously checks if lock is still owned.
   */
  async verify() {
    if (!this.isOwned) return false;
    const current = await redis_default.get(this.lockKey);
    if (current !== this.workerId) {
      this.isOwned = false;
      this.abortController.abort();
      this.stopRenewal();
      return false;
    }
    return true;
  }
  /**
   * Ensure we own the lock, or throw an error.
   */
  async ensureOwnership() {
    const valid = await this.verify();
    if (!valid) {
      throw new Error(`Execution aborted: Worker ${this.workerId} lost lock for execution ${this.executionId}`);
    }
  }
  /**
   * Stops the renewal timer but doesn't release the lock.
   */
  stopRenewal() {
    if (this.renewalTimer) {
      clearInterval(this.renewalTimer);
      this.renewalTimer = null;
    }
  }
  /**
   * Releases the lock safely.
   */
  async release() {
    this.stopRenewal();
    if (!this.isOwned) return;
    const script = `
            if redis.call("get", KEYS[1]) == ARGV[1] then
                return redis.call("del", KEYS[1])
            else
                return 0
            end
        `;
    try {
      await redis_default.eval(script, 1, this.lockKey, this.workerId);
      this.isOwned = false;
      logger_default.info({ executionId: this.executionId, workerId: this.workerId }, "Released execution lock");
    } catch (err) {
      logger_default.error({ err, executionId: this.executionId }, "Failed to release lock");
    }
  }
};

// src/config/pusher.ts
var pusher = {
  /**
   * Called by task-orchestrator updateLegacyUiStage().
   * Re-routes to Redis Streams Event Bus.
   */
  triggerBuildUpdate(executionId, stageData) {
    if (!executionId) return;
    const progress = stageData.progressPercent ?? stageData.progress ?? 0;
    eventBus.stage(
      executionId,
      stageData.id || "initializing",
      stageData.status || "in_progress",
      stageData.message || "",
      progress
    ).catch((err) => logger_default.warn({ err }, "[Pusher stub] Failed to route to event bus"));
  }
};

// src/config/rate-limiter.ts
var LUA_TOKEN_BUCKET = `
local key = KEYS[1]
local rate = tonumber(ARGV[1])
local capacity = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local requested = tonumber(ARGV[4] or 1)

local state = redis.call("HMGET", key, "tokens", "last_refreshed")
local last_tokens = tonumber(state[1])
local last_refreshed = tonumber(state[2])

if not last_tokens then
    last_tokens = capacity
    last_refreshed = now
end

local delta = math.max(0, now - last_refreshed)
local new_tokens = math.min(capacity, last_tokens + (delta * rate))

if new_tokens >= requested then
    local remaining = new_tokens - requested
    redis.call("HMSET", key, "tokens", remaining, "last_refreshed", now)
    redis.call("PEXPIRE", key, math.ceil((capacity / rate) * 1000))
    return {1, math.floor(remaining)}
else
    local wait_ms = math.ceil(((requested - new_tokens) / rate) * 1000)
    return {0, math.floor(new_tokens), wait_ms}
end
`;
var RateLimiter = class {
  /**
   * @param action unique identifier for the action (e.g., 'build', 'github-push')
   * @param userId user identifier
   * @param limit tokens per window (e.g., 3)
   * @param windowMs window in milliseconds (e.g., 3600000 for 1 hour)
   */
  static async checkLimit(action, userId, limit, windowMs) {
    try {
      const key = `ratelimit:${action}:${userId}`;
      const rate = limit / (windowMs / 1e3);
      const now = Date.now() / 1e3;
      const result = await redis_default.eval(
        LUA_TOKEN_BUCKET,
        1,
        key,
        rate.toString(),
        limit.toString(),
        now.toString(),
        "1"
      );
      const [allowed, remaining, waitMs] = result;
      return {
        allowed: allowed === 1,
        remaining,
        retryAfter: waitMs ? Math.ceil(waitMs / 1e3) : void 0
      };
    } catch (error) {
      logger_default.error({ error, action, userId }, "Rate limiter failure. Failing open for safety.");
      return { allowed: true, remaining: 1 };
    }
  }
  // Convenience methods for specific SaaS rules
  static async checkBuildLimit(userId, isPro) {
    const limit = isPro ? 100 : 3;
    return this.checkLimit("build", userId, limit, 3600 * 1e3);
  }
  static async checkGithubLimit(userId, isPro) {
    const limit = isPro ? 5 : 1;
    return this.checkLimit("github-push", userId, limit, 3600 * 1e3);
  }
  static async checkExportLimit(userId) {
    return this.checkLimit("export", userId, 10, 3600 * 1e3);
  }
};

// src/config/schemas.ts
import { z } from "zod";
var ProjectGenerationSchema = z.object({
  projectId: z.string().min(1, { message: "Project ID is required" }),
  prompt: z.string().min(10, { message: "Prompt must be at least 10 characters" }).max(5e3),
  template: z.string().optional(),
  executionId: z.string().min(1).optional(),
  isChaosTest: z.boolean().optional(),
  settings: z.object({
    model: z.enum(["fast", "thinking", "pro"]).optional(),
    priority: z.boolean().optional()
  }).optional()
});
var UserProfileSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(2).optional()
});
var StripeWebhookSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.object({
    object: z.any()
  })
});

// src/config/stream-client.ts
import { useEffect, useRef, useState, useCallback } from "react";
function useStream({ url, onData, onError, heartbeatTimeout = 15e3 }) {
  const eventSourceRef = useRef(null);
  const lastMessageRef = useRef(Date.now());
  const [status, setStatus] = useState("connecting");
  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    console.log(`[StreamClient] Connecting to ${url}`);
    const es = new EventSource(url);
    eventSourceRef.current = es;
    es.onopen = () => {
      console.log(`[StreamClient] Connected to ${url}`);
      setStatus("connected");
      lastMessageRef.current = Date.now();
    };
    es.onmessage = (event) => {
      try {
        lastMessageRef.current = Date.now();
        const data = JSON.parse(event.data);
        onData(data);
      } catch (err) {
        console.error("[StreamClient] Parse error:", err);
      }
    };
    es.onerror = (err) => {
      console.warn(`[StreamClient] Connection error on ${url}:`, err);
      setStatus("error");
      if (onError) onError(err);
    };
  }, [url, onData, onError]);
  useEffect(() => {
    connect();
    const heartbeatInterval = setInterval(() => {
      const timeSinceLastMessage = Date.now() - lastMessageRef.current;
      if (timeSinceLastMessage > heartbeatTimeout) {
        console.warn(`[StreamClient] Heartbeat stale (${timeSinceLastMessage}ms). Reconnecting...`);
        connect();
      }
    }, 5e3);
    return () => {
      console.log(`[StreamClient] Closing stream to ${url}`);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      clearInterval(heartbeatInterval);
    };
  }, [connect, url, heartbeatTimeout]);
  return { status, reconnect: connect };
}

// src/config/utils.ts
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// src/services/index.ts
var services_exports = {};
__export(services_exports, {
  AnchoringService: () => AnchoringService,
  AuditLogger: () => AuditLogger,
  CodeChunker: () => CodeChunker,
  DistributedExecutionContext: () => DistributedExecutionContext,
  EmbeddingsEngine: () => EmbeddingsEngine,
  ErrorKnowledgeBase: () => ErrorKnowledgeBase,
  GuardrailService: () => GuardrailService,
  MemoryPlane: () => MemoryPlane,
  Orchestrator: () => Orchestrator,
  PatchEngine: () => PatchEngine,
  PersistenceStore: () => PersistenceStore,
  PreviewManager: () => PreviewManager,
  ProjectStateManager: () => ProjectStateManager,
  QUEUE_FREE: () => QUEUE_FREE,
  QUEUE_PRO: () => QUEUE_PRO,
  RecoveryNotifier: () => RecoveryNotifier,
  SandboxPodController: () => SandboxPodController,
  StageState: () => StageState,
  StageStateMachine: () => StageStateMachine,
  TemplateService: () => TemplateService,
  VectorStore: () => VectorStore,
  VirtualFileSystem: () => VirtualFileSystem,
  WorkerClusterManager: () => WorkerClusterManager,
  eventBus: () => eventBus,
  freeQueue: () => freeQueue,
  getLatestBuildState: () => getLatestBuildState,
  getSupabaseAdmin: () => getSupabaseAdmin,
  guardrailService: () => guardrailService,
  independentRedisClients: () => independentRedisClients,
  memoryPlane: () => memoryPlane,
  missionController: () => missionController,
  normalizeError: () => normalizeError,
  patchEngine: () => patchEngine,
  proQueue: () => proQueue,
  projectMemory: () => projectMemory,
  publishBuildEvent: () => publishBuildEvent,
  readBuildEvents: () => readBuildEvents,
  recoveryNotifier: () => recoveryNotifier,
  redis: () => redis,
  sandboxPodController: () => sandboxPodController,
  stateManager: () => stateManager,
  supabaseAdmin: () => supabaseAdmin,
  templateService: () => templateService,
  validatePatchOrThrow: () => validatePatchOrThrow
});

// src/services/audit-logger.ts
import { prisma } from "@libs/db";
import crypto2 from "crypto";
var AuditLogger = class {
  static INITIAL_HASH = "0".repeat(64);
  // Seed hash for the first log
  /**
   * Generates a SHA-256 hash for the current event, chained to the previous hash.
   */
  static calculateHash(event, prevHash) {
    const data = JSON.stringify({
      tenantId: event.tenantId,
      userId: event.userId,
      action: event.action,
      resource: event.resource,
      metadata: event.metadata,
      prevHash
    });
    return crypto2.createHash("sha256").update(data).digest("hex");
  }
  /**
   * Records a tamper-proof audit event.
   */
  static async log(event) {
    try {
      const latestLog = await prisma.auditLog.findFirst({
        where: { tenantId: event.tenantId },
        orderBy: { createdAt: "desc" },
        select: { hash: true }
      });
      const prevHash = latestLog ? latestLog.hash : this.INITIAL_HASH;
      const hash = this.calculateHash(event, prevHash);
      await prisma.auditLog.create({
        data: {
          tenantId: event.tenantId,
          userId: event.userId,
          action: event.action,
          resource: event.resource,
          metadata: event.metadata,
          ipAddress: event.ipAddress,
          hash
        }
      });
      logger_default.info({ action: event.action, tenantId: event.tenantId }, "[AuditLogger] Recorded secure audit event");
    } catch (err) {
      logger_default.error({ err }, "[AuditLogger] Failed to record audit event");
    }
  }
  /**
   * Verifies the integrity of the audit chain for a tenant.
   * Returns true if the chain is intact, false otherwise.
   */
  static async verifyChain(tenantId) {
    try {
      const logs = await prisma.auditLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: "asc" }
      });
      let currentPrevHash = this.INITIAL_HASH;
      for (const log of logs) {
        const expectedHash = this.calculateHash({
          tenantId: log.tenantId,
          userId: log.userId,
          action: log.action,
          resource: log.resource,
          metadata: log.metadata
        }, currentPrevHash);
        if (log.hash !== expectedHash) {
          logger_default.error({ logId: log.id }, "[AuditLogger] Tamper detected in audit chain!");
          return false;
        }
        currentPrevHash = log.hash;
      }
      return true;
    } catch (err) {
      logger_default.error({ err }, "[AuditLogger] Failed to verify audit chain");
      return false;
    }
  }
  /**
   * Retrieves the most recent log entry for a tenant.
   */
  static async getLatestLog(tenantId) {
    const logs = await prisma.auditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 1
    });
    return logs[0] || null;
  }
};

// src/services/anchoring-service.ts
var AnchoringService = class {
  static ANCHOR_BUCKET = "audit-anchors-production";
  /**
   * Captures the current latest hash from the audit chain and anchors it.
   * In production, this would upload to S3 Glacier or a Blockchain.
   */
  static async anchorChain(tenantId) {
    try {
      const latestLog = await AuditLogger.getLatestLog(tenantId);
      if (!latestLog) return null;
      const anchorPoint = {
        tenantId,
        rootHash: latestLog.hash,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        logId: latestLog.id
      };
      logger_default.info({ anchorPoint }, "[AnchoringService] Successfully anchored audit chain externally");
      return latestLog.hash;
    } catch (err) {
      logger_default.error({ err }, "[AnchoringService] Failed to anchor audit chain");
      return null;
    }
  }
  /**
   * Verifies the local DB chain against the latest external anchor.
   */
  static async verifyAgainstAnchor(tenantId, anchoredHash) {
    const latestLog = await AuditLogger.getLatestLog(tenantId);
    if (!latestLog) return false;
    if (latestLog.hash !== anchoredHash) {
      logger_default.error({ local: latestLog.hash, anchored: anchoredHash }, "[AnchoringService] Audit Chain Integrity Violation detected!");
      return false;
    }
    return await AuditLogger.verifyChain(tenantId);
  }
};

// src/services/build-queue.ts
import { Queue as Queue2 } from "bullmq";
var QUEUE_FREE = "project-generation-free-v1";
var QUEUE_PRO = "project-generation-pro-v1";
var connection = redis_default;
var defaultOptions = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 5e3
  },
  removeOnComplete: false,
  // Audit trail
  removeOnFail: {
    age: 24 * 3600
    // keep for 24 hours
  }
};
var freeQueue = new Queue2(QUEUE_FREE, {
  connection,
  defaultJobOptions: defaultOptions
});
var proQueue = new Queue2(QUEUE_PRO, {
  connection,
  defaultJobOptions: defaultOptions
});
logger_default.info(`BullMQ Tiered Queues "${QUEUE_FREE}" and "${QUEUE_PRO}" initialized`);

// src/services/error-knowledge-base.ts
import crypto3 from "crypto";
var ErrorKnowledgeBase = class {
  static PREFIX = "error_kb:";
  /**
   * Normalizes and hashes an error message for lookup.
   */
  static hashError(error) {
    const normalized = error.replace(/\/.*?\/MultiAgent\//g, "PROJECT_ROOT/").replace(/:\d+:\d+/g, ":LINE:COL").replace(/0x[0-9a-fA-F]+/g, "HEX_VAL").replace(/[a-f0-9]{8,}/g, "HASH_VAL").replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/g, "TIMESTAMP").trim();
    return crypto3.createHash("md4").update(normalized).digest("hex");
  }
  /**
   * Fetches a cached solution for a given error message.
   */
  static async getSolution(error) {
    try {
      const hash = this.hashError(error);
      const cached = await redis.get(`${this.PREFIX}${hash}`);
      if (cached) {
        logger_default.info({ hash }, "[ErrorKB] Cache hit for error");
        return JSON.parse(cached);
      }
      return null;
    } catch (err) {
      logger_default.warn({ err }, "[ErrorKB] Failed to fetch solution from cache");
      return null;
    }
  }
  /**
   * Records a successful solution for an error.
   */
  static async recordSolution(error, solution) {
    try {
      const hash = this.hashError(error);
      await redis.set(`${this.PREFIX}${hash}`, JSON.stringify(solution), "EX", 86400);
      logger_default.info({ hash }, "[ErrorKB] Recorded new solution for error");
    } catch (err) {
      logger_default.error({ err }, "[ErrorKB] Failed to record solution");
    }
  }
};

// src/services/execution-context.ts
import { v4 as uuidv43 } from "uuid";
import * as crypto4 from "crypto";

// src/services/vfs/virtual-fs.ts
var VirtualFileSystem = class {
  files = /* @__PURE__ */ new Map();
  writeFile(path5, content, encoding = "utf-8") {
    this.files.set(path5, { path: path5, content, encoding });
  }
  readFile(path5) {
    return this.files.get(path5)?.content || null;
  }
  exists(path5) {
    return this.files.has(path5);
  }
  createSnapshot() {
    return Array.from(this.files.entries());
  }
  restoreSnapshot(snapshot) {
    this.files = new Map(snapshot);
  }
  isEmpty() {
    return this.files.size === 0;
  }
};

// src/services/execution-context.ts
var DistributedExecutionContext = class _DistributedExecutionContext {
  executionId;
  key;
  vfs = new VirtualFileSystem();
  static TTL = 86400;
  // 24 hours
  // Properties from ExecutionContextType
  userId = "";
  projectId = "";
  prompt = "";
  status = "initializing";
  currentStageIndex = 0;
  currentStage = "";
  version = 0;
  paymentStatus = "pending";
  agentResults = {};
  journals = {};
  retryPolicies = {};
  metrics = { startTime: (/* @__PURE__ */ new Date()).toISOString() };
  metadata = {};
  history = [];
  correlationId = "";
  lastCommitHash = "0".repeat(64);
  // Seed hash
  locked;
  finalFiles;
  vfsSnapshot;
  static LUA_TRANSITION_SCRIPT = `
        local contextKey = KEYS[1]
        local lockKey = KEYS[2]
        local commitLogKey = KEYS[3]
        
        local expectedWorkerId = ARGV[1]
        local stageId = ARGV[2]
        local stageIndex = tonumber(ARGV[3])
        local status = ARGV[4]
        local message = ARGV[5]
        local inputHash = ARGV[6]
        local outputHash = ARGV[7]
        local expectedVersion = tonumber(ARGV[8])
        local timestamp = ARGV[9]
        local commitHash = ARGV[10]

        -- 1. Validate Lock Ownership
        local currentLockOwner = redis.call("get", lockKey)
        if currentLockOwner ~= expectedWorkerId then
            return {err = "LOCK_LOST", owner = currentLockOwner}
        end

        -- 2. Validate Context & Version
        local data = redis.call("get", contextKey)
        if not data then return {err = "CONTEXT_MISSING"} end

        local ctx = cjson.decode(data)
        
        -- Version Check (Optimistic Locking)
        if expectedVersion and ctx.version ~= expectedVersion then
            return {err = "VERSION_MISMATCH", current = ctx.version, expected = expectedVersion}
        end

        -- Monotonicity Check
        if stageIndex < ctx.currentStageIndex then
            return {err = "BACKWARD_TRANSITION", current = ctx.currentStageIndex}
        end

        -- 3. Update State
        if not ctx.agentResults then ctx.agentResults = {} end
        local stage = ctx.agentResults[stageId] or {attempts = 0}
        
        stage.agentName = stageId
        stage.status = status
        stage.workerId = expectedWorkerId
        
        if status == "in_progress" then
           stage.startTime = stage.startTime or timestamp
           stage.inputHash = inputHash
           stage.attempts = stage.attempts + 1
        elseif status == "completed" then
           stage.endTime = timestamp
           stage.outputHash = outputHash
           
           -- Append to Commit Log
           local duration = 0
           if stage.startTime then
              -- Simplified duration calc since Lua doesn't have native ISO parser
              -- In production we'd pass numeric timestamps
              duration = 0 
           end
           
           local logEntry = {
              stageIndex = stageIndex,
              inputHash = stage.inputHash,
              outputHash = outputHash,
              commitHash = commitHash,
              workerId = expectedWorkerId,
              startedAt = stage.startTime or timestamp,
              completedAt = timestamp,
              durationMs = duration,
              retryCount = stage.attempts - 1
           }
           redis.call("RPUSH", commitLogKey, cjson.encode(logEntry))
           ctx.lastCommitHash = commitHash
        end

        ctx.agentResults[stageId] = stage
        ctx.currentStage = stageId
        ctx.currentStageIndex = stageIndex
        ctx.version = ctx.version + 1
        ctx.currentMessage = message
        ctx.status = "executing"

        -- 4. Persist
        redis.call("setex", contextKey, 86400, cjson.encode(ctx))
        return {ok = "SUCCESS", version = ctx.version}
    `;
  constructor(executionId) {
    this.executionId = executionId || uuidv43();
    this.key = `execution:${this.executionId}`;
  }
  getVFS() {
    return this.vfs;
  }
  getExecutionId() {
    return this.executionId;
  }
  getProjectId() {
    return this.projectId;
  }
  async init(userId, projectId, prompt, correlationId, planType = "free") {
    this.userId = userId;
    this.projectId = projectId;
    this.prompt = prompt;
    this.correlationId = correlationId;
    this.status = "initializing";
    this.currentStageIndex = 0;
    this.currentStage = "start";
    this.paymentStatus = "pending";
    this.agentResults = {};
    this.metrics = {
      startTime: (/* @__PURE__ */ new Date()).toISOString(),
      promptTokensTotal: 0,
      completionTokensTotal: 0,
      tokensTotal: 0
    };
    this.metadata = { planType };
    const context2 = {
      executionId: this.executionId,
      userId,
      projectId,
      prompt,
      correlationId,
      status: this.status,
      currentStageIndex: this.currentStageIndex,
      currentStage: this.currentStage,
      paymentStatus: "pending",
      agentResults: {},
      journals: {},
      retryPolicies: {},
      version: 0,
      metrics: {
        startTime: (/* @__PURE__ */ new Date()).toISOString(),
        promptTokensTotal: 0,
        completionTokensTotal: 0,
        tokensTotal: 0
      },
      metadata: { planType },
      lastCommitHash: "0".repeat(64),
      vfsSnapshot: this.vfs.createSnapshot()
    };
    await redis.setex(this.key, _DistributedExecutionContext.TTL, JSON.stringify(context2));
    await redis.sadd("active:executions", this.executionId);
    return context2;
  }
  static async getActiveExecutions() {
    return await redis.smembers("active:executions");
  }
  async get() {
    const data = await redis.get(this.key);
    return data ? JSON.parse(data) : null;
  }
  /**
   * Pulls the latest state from Redis and hydrates the local VFS.
   */
  async sync() {
    const data = await this.get();
    if (data) {
      if (data.userId) this.userId = data.userId;
      if (data.projectId) this.projectId = data.projectId;
      if (data.prompt) this.prompt = data.prompt;
      if (data.status) this.status = data.status;
      if (data.currentStageIndex) this.currentStageIndex = data.currentStageIndex;
      if (data.currentStage) this.currentStage = data.currentStage;
      if (data.version) this.version = data.version;
      if (data.agentResults) this.agentResults = data.agentResults;
      if (data.metadata) this.metadata = data.metadata;
      if (data.vfsSnapshot) {
        this.vfs.restoreSnapshot(data.vfsSnapshot);
      }
    }
    return data;
  }
  async update(updates) {
    const current = await this.get();
    if (!current) throw new Error(`Execution context ${this.executionId} not found`);
    const updated = { ...current, ...updates };
    await redis.setex(this.key, _DistributedExecutionContext.TTL, JSON.stringify(updated));
  }
  async updateStage(stageId) {
    await this.atomicUpdate((ctx) => {
      ctx.currentStage = stageId;
    });
  }
  async atomicTransition(lock, stageId, stageIndex, status, message, inputHash, outputHash) {
    const currentVersion = (await this.get())?.version || 0;
    const commitLogKey = `commitLog:${this.executionId}`;
    const result = await redis.eval(
      _DistributedExecutionContext.LUA_TRANSITION_SCRIPT,
      3,
      this.key,
      lock.getLockKey(),
      commitLogKey,
      lock.getWorkerId(),
      stageId,
      stageIndex.toString(),
      status,
      message,
      inputHash || "",
      outputHash || "",
      currentVersion.toString(),
      (/* @__PURE__ */ new Date()).toISOString(),
      status == "completed" ? _DistributedExecutionContext.computeChainedHash(
        (await this.get())?.lastCommitHash || "0".repeat(64),
        { stageId, inputHash, outputHash, stageIndex }
      ) : ""
    );
    if (result.err) {
      if (result.err === "LOCK_LOST") {
        throw new Error(`LOCK_LOST: Worker ${lock.getWorkerId()} no longer owns execution ${this.executionId}. Current owner: ${result.owner}`);
      }
      if (result.err === "VERSION_MISMATCH") {
        throw new Error(`VERSION_MISMATCH: Stale transition attempt. Current version: ${result.current}, Expected: ${result.expected}`);
      }
      throw new Error(`TRANSITION_FAILED: ${result.err}`);
    }
    return result.version;
  }
  /**
   * WRITE-AHEAD JOURNALING
   */
  async writeJournal(stageIndex, operationId, status, lock, inputHash, outputHash, expectedVersion) {
    await this.atomicUpdate((ctx) => {
      if (expectedVersion !== void 0 && ctx.version !== expectedVersion) {
        throw new Error(`VERSION_MISMATCH: Stale journal write. Current: ${ctx.version}, Expected: ${expectedVersion}`);
      }
      const entry = {
        operationId,
        stageIndex,
        workerId: lock.getWorkerId(),
        status,
        inputHash,
        outputHash,
        createdAt: ctx.journals[operationId]?.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      ctx.journals[operationId] = entry;
      ctx.version += 1;
    });
  }
  async getJournal(operationId) {
    const ctx = await this.get();
    return ctx?.journals[operationId] || null;
  }
  async getCommitLog() {
    const logs = await redis.lrange(`commitLog:${this.executionId}`, 0, -1);
    return logs.map((l) => JSON.parse(l));
  }
  static computeHash(input) {
    const str = typeof input === "string" ? input : JSON.stringify(input);
    return crypto4.createHash("sha256").update(str).digest("hex");
  }
  static computeChainedHash(previousHash, data) {
    const dataStr = JSON.stringify(data);
    return crypto4.createHash("sha256").update(previousHash + dataStr).digest("hex");
  }
  async performOnce(key, fn) {
    const lockKey = `once:${this.executionId}:${key}`;
    const acquired = await redis.set(lockKey, "locked", "EX", 3600, "NX");
    if (acquired === "OK") {
      try {
        return await fn();
      } catch (err) {
        await redis.del(lockKey);
        throw err;
      }
    }
    logger_default.info({ executionId: this.executionId, key }, "Skipped performOnce block - already executed");
    return null;
  }
  async setAgentResult(agentName, result) {
    await this.atomicUpdate((ctx) => {
      const existing = ctx.agentResults[agentName] || {
        agentName,
        status: "pending",
        attempts: 0,
        startTime: (/* @__PURE__ */ new Date()).toISOString()
      };
      ctx.agentResults[agentName] = {
        ...existing,
        ...result,
        endTime: result.status === "completed" || result.status === "failed" ? (/* @__PURE__ */ new Date()).toISOString() : void 0
      };
    });
  }
  async updateUiStage(stage, status, msg) {
    await eventBus.stage(this.executionId, stage, status, msg, 0, this.projectId);
  }
  async finalize(status, expectedVersion) {
    await this.atomicUpdate((ctx) => {
      if (expectedVersion !== void 0 && ctx.version !== expectedVersion) {
        throw new Error(`VERSION_MISMATCH: Stale finalize. Current: ${ctx.version}, Expected: ${expectedVersion}`);
      }
      ctx.status = status;
      ctx.locked = true;
      ctx.metrics.endTime = (/* @__PURE__ */ new Date()).toISOString();
      ctx.metrics.totalDurationMs = (/* @__PURE__ */ new Date()).getTime() - new Date(ctx.metrics.startTime).getTime();
      ctx.version += 1;
    });
    await redis.srem("active:executions", this.executionId);
  }
  /**
   * DEAD LETTER RECORDING
   */
  async recordToDeadLetter(reason, metadata = {}) {
    const ctx = await this.get();
    if (!ctx) return;
    const dlqEntry = {
      ...ctx,
      deadLetteredAt: (/* @__PURE__ */ new Date()).toISOString(),
      reason,
      extraMetadata: metadata
    };
    const dlqKey = `dlq:execution:${this.executionId}`;
    await redis.setex(dlqKey, 604800, JSON.stringify(dlqEntry));
    await redis.sadd("dlq:executions", this.executionId);
    await redis.srem("active:executions", this.executionId);
    logger_default.error({ executionId: this.executionId, reason }, "Execution moved to Dead Letter Queue");
  }
  /**
   * Atomic update using Redis WATCH/MULTI/EXEC for safe concurrency
   */
  async atomicUpdate(updater) {
    for (let i = 0; i < 5; i++) {
      try {
        await redis.watch(this.key);
        const { getSupabaseAdmin: getSupabaseAdmin2 } = await Promise.resolve().then(() => (init_supabase_admin(), supabase_admin_exports));
        const supabaseAdmin2 = getSupabaseAdmin2();
        const data = await redis.get(this.key);
        if (!data) throw new Error(`Execution context ${this.executionId} not found`);
        const context2 = JSON.parse(data);
        if (context2.locked) {
          await redis.unwatch();
          return;
        }
        if (context2.vfsSnapshot && this.vfs.isEmpty()) {
          this.vfs.restoreSnapshot(context2.vfsSnapshot);
        }
        updater(context2);
        context2.vfsSnapshot = this.vfs.createSnapshot();
        const result = await redis.multi().setex(this.key, _DistributedExecutionContext.TTL, JSON.stringify(context2)).exec();
        if (result) return;
        logger_default.warn({ executionId: this.executionId, attempt: i }, "Concurrency conflict on context update, retrying...");
      } catch (err) {
        await redis.unwatch();
        throw err;
      }
    }
    throw new Error(`Failed to update execution context ${this.executionId} after multiple attempts due to concurrency.`);
  }
};

// src/services/guardrail-service.ts
var GuardrailService = class {
  PROTECTED_FILES = [
    "package.json",
    "tsconfig.json",
    "next.config.js",
    "next.config.mjs",
    "tailwind.config.js",
    "tailwind.config.ts",
    ".env",
    ".env.local"
  ];
  /**
   * Validates and sanitizes agent file outputs according to reliability rules.
   */
  validateOutput(files, originalFiles) {
    const violations = [];
    const sanitizedFiles = [];
    for (const file of files) {
      const fileName = file.path.split("/").pop() || "";
      const isProtected = this.PROTECTED_FILES.includes(fileName);
      if (isProtected) {
        const original = originalFiles[file.path];
        const isCriticalConfig = ["next.config.js", "next.config.mjs", "tsconfig.json", "tailwind.config.js", "tailwind.config.ts"].includes(fileName);
        if (isCriticalConfig && original && file.content !== original) {
          violations.push(`CRITICAL: Unauthorized modification of build infrastructure: ${file.path}. This file is locked for stability.`);
          logger_default.error({ path: file.path }, "[GuardrailService] BLOCK: AI attempted to modify locked config file");
          sanitizedFiles.push({ path: file.path, content: original });
          continue;
        }
        if (original && file.content !== original) {
          violations.push(`Unauthorized modification of critical file: ${file.path}. AI is not permitted to modify project infrastructure.`);
          logger_default.warn({ path: file.path }, "[GuardrailService] Guard: Reverted config modification");
          sanitizedFiles.push({ path: file.path, content: original });
          continue;
        }
      }
      sanitizedFiles.push(file);
    }
    return {
      isValid: violations.length === 0,
      violations,
      sanitizedFiles
    };
  }
  isDestructive(original, updated, fileName) {
    if (fileName === "package.json") {
      try {
        const oldPkg = JSON.parse(original);
        const newPkg = JSON.parse(updated);
        const criticalScripts = ["dev", "build", "start"];
        for (const script of criticalScripts) {
          if (oldPkg.scripts?.[script] && !newPkg.scripts?.[script]) return true;
        }
        return false;
      } catch {
        return true;
      }
    }
    return false;
  }
};
var guardrailService = new GuardrailService();

// src/services/patch-engine.ts
import fs3 from "fs-extra";
import path3 from "path";
var PatchEngine = class {
  /**
   * Applies a patch to existing file content using anchor markers.
   * Markers format: <!-- ANCHOR_START --> and <!-- ANCHOR_END -->
   */
  applyAnchorPatch(fileContent, anchor, replacement) {
    const startMarker = `<!-- ${anchor}_START -->`;
    const endMarker = `<!-- ${anchor}_END -->`;
    const startIndex = fileContent.indexOf(startMarker);
    const endIndex = fileContent.indexOf(endMarker);
    if (startIndex === -1 || endIndex === -1) {
      logger_default.warn({ anchor }, "[PatchEngine] Anchor markers not found. Falling back to append mode.");
      return this.fallbackPatch(fileContent, replacement);
    }
    const before = fileContent.substring(0, startIndex + startMarker.length);
    const after = fileContent.substring(endIndex);
    return `${before}
${replacement}
${after}`;
  }
  /**
   * Fallback strategy when anchors are missing.
   * For TSX/JSX, we try to insert before the last export or end of file.
   */
  fallbackPatch(content, replacement) {
    return `${content}

// --- AI Generated Patch (Fallback) ---
${replacement}
`;
  }
  /**
   * Mass apply patches to a virtual file system.
   */
  applyPatches(files, patches) {
    const updatedFiles = [...files];
    for (const patch of patches) {
      const fileIndex = updatedFiles.findIndex((f) => f.path === patch.path);
      if (fileIndex !== -1) {
        if (patch.anchor) {
          updatedFiles[fileIndex].content = this.applyAnchorPatch(
            updatedFiles[fileIndex].content,
            patch.anchor,
            patch.content
          );
        } else {
          updatedFiles[fileIndex].content = patch.content;
        }
      } else {
        updatedFiles.push({ path: patch.path, content: patch.content });
      }
    }
    return updatedFiles;
  }
  async applyPatch(projectId, filePath, content) {
    const sandboxDir = path3.join(process.cwd(), ".generated-projects", projectId);
    const fullPath = path3.join(sandboxDir, filePath);
    try {
      await fs3.ensureDir(path3.dirname(fullPath));
      await fs3.writeFile(fullPath, content);
      logger_default.info({ projectId, filePath }, "[PatchEngine] Single patch applied to sandbox");
    } catch (err) {
      logger_default.error({ projectId, filePath, err }, "[PatchEngine] Single patch failed");
    }
  }
};
var patchEngine = new PatchEngine();

// src/services/preview-manager.ts
import { prisma as prisma2 } from "@libs/db";
var PreviewManager = class {
  static async generatePreviewUrl(buildId) {
    const previewUrl = `https://preview-${buildId.slice(0, 8)}.multiagent.app`;
    logger_default.info({ buildId, previewUrl }, "[PreviewManager] Generated preview URL");
    try {
      await prisma2.build.update({
        where: { id: buildId },
        data: { previewUrl }
      });
    } catch (err) {
      logger_default.error({ err }, "[PreviewManager] Failed to update build with preview URL");
    }
    return previewUrl;
  }
};

// src/services/recovery-notifier.ts
import axios2 from "axios";
var RecoveryNotifier = class {
  webhookUrl = process.env.ALERTS_WEBHOOK_URL;
  async notifyFailure(executionId, error) {
    const message = `\xF0\u0178\u0161\xA8 *Build Pipeline Failure* \xF0\u0178\u0161\xA8
*Execution ID:* ${executionId}
*Error:* ${error}
*Timestamp:* ${(/* @__PURE__ */ new Date()).toISOString()}`;
    logger_default.error({ executionId, error }, "[RecoveryNotifier] Dispatching alert");
    if (this.webhookUrl) {
      try {
        await axios2.post(this.webhookUrl, { text: message });
      } catch (err) {
        logger_default.error({ err }, "[RecoveryNotifier] Failed to send webhook alert");
      }
    }
  }
  async notifySuccess(executionId) {
    const message = `\xE2\u0153\u2026 *Build Pipeline Success* \xE2\u0153\u2026
*Execution ID:* ${executionId}`;
    if (this.webhookUrl) {
      try {
        await axios2.post(this.webhookUrl, { text: message });
      } catch (err) {
        logger_default.error({ err }, "[RecoveryNotifier] Failed to send webhook success notification");
      }
    }
  }
};
var recoveryNotifier = new RecoveryNotifier();

// src/services/sandbox-pod-controller.ts
import * as k8s from "@kubernetes/client-node";
var SandboxPodController = class {
  k8sApi;
  namespace = "multi-agent-sandboxes";
  constructor() {
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();
    this.k8sApi = kc.makeApiClient(k8s.CoreV1Api);
  }
  async createSandbox(projectId, executionId) {
    const podName = `sandbox-${projectId}-${executionId}`.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const pod = {
      metadata: {
        name: podName,
        labels: {
          app: "sandbox",
          projectId,
          executionId
        }
      },
      spec: {
        containers: [{
          name: "runtime",
          image: "multi-agent-sandbox-runtime:latest",
          resources: {
            limits: {
              memory: "512Mi",
              cpu: "500m"
            }
          },
          env: [
            { name: "PROJECT_ID", value: projectId },
            { name: "EXECUTION_ID", value: executionId }
          ]
        }],
        restartPolicy: "Never"
      }
    };
    try {
      await this.k8sApi.createNamespacedPod(this.namespace, pod);
      logger_default.info({ podName, projectId }, "[SandboxPodController] Pod created successfully");
      return podName;
    } catch (err) {
      logger_default.error({ err, podName }, "[SandboxPodController] Failed to create pod");
      throw err;
    }
  }
  async deleteSandbox(podName) {
    try {
      await this.k8sApi.deleteNamespacedPod(podName, this.namespace);
      logger_default.info({ podName }, "[SandboxPodController] Pod deleted");
    } catch (err) {
      logger_default.error({ err, podName }, "[SandboxPodController] Failed to delete pod");
    }
  }
};
var sandboxPodController = new SandboxPodController();

// src/services/self-healer.ts
var FORBIDDEN_PATTERNS = [
  "rm -rf",
  "process.exit",
  "fs.unlink",
  "child_process.exec",
  "eval(",
  "/etc/passwd",
  ".env"
];
var MAX_PATCH_LENGTH = 5e3;
function validatePatchOrThrow(patch) {
  if (!patch || !patch.content) {
    throw new Error("Invalid patch: Missing content");
  }
  if (patch.content.length > MAX_PATCH_LENGTH) {
    logger_default.warn({ path: patch.path, size: patch.content.length }, "[SelfHealer] Patch rejected: Too large");
    throw new Error(`Patch too large (${patch.content.length} chars) - possible AI hallucination`);
  }
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (patch.content.includes(pattern)) {
      logger_default.error({ path: patch.path, pattern }, "[SelfHealer] Security violation detected");
      throw new Error(`Unsafe patch detected: Contains forbidden pattern "${pattern}"`);
    }
  }
  logger_default.info({ path: patch.path }, "[SelfHealer] Patch security check passed");
}
function normalizeError(error) {
  if (!error) return "unknown_error";
  if (typeof error === "string") return error.toLowerCase();
  if (error instanceof Error) return error.message.toLowerCase();
  return JSON.stringify(error).toLowerCase();
}

// src/services/index.ts
init_supabase_admin();

// src/services/template-service.ts
import fs4 from "fs-extra";
import path4 from "path";
var TemplateService = class {
  templatesDir = path4.join(process.cwd(), "templates");
  async injectTemplate(templateName, context2) {
    const templatePath = path4.join(this.templatesDir, templateName);
    if (!await fs4.pathExists(templatePath)) {
      logger_default.warn({ templateName }, "[TemplateService] Template not found");
      return false;
    }
    try {
      const files = {};
      await this.readTemplateFiles(templatePath, templatePath, files);
      const vfs = context2.getVFS();
      for (const [filePath, content] of Object.entries(files)) {
        vfs.setFile(filePath, content);
      }
      await context2.atomicUpdate(() => {
      });
      logger_default.info({ templateName, fileCount: Object.keys(files).length }, "[TemplateService] Template injected into VFS");
      return true;
    } catch (error) {
      logger_default.error({ error, templateName }, "[TemplateService] Failed to inject template");
      return false;
    }
  }
  async readTemplateFiles(basePath, currentPath, files) {
    const entries = await fs4.readdir(currentPath, { withFileTypes: true });
    const EXCLUDED_DIRS = ["node_modules", ".next", ".git", "dist", ".turbo"];
    for (const entry of entries) {
      const fullPath = path4.join(currentPath, entry.name);
      const relativePath = path4.relative(basePath, fullPath).replace(/\\/g, "/");
      if (entry.isDirectory()) {
        if (EXCLUDED_DIRS.includes(entry.name)) {
          continue;
        }
        await this.readTemplateFiles(basePath, fullPath, files);
      } else {
        const content = await fs4.readFile(fullPath, "utf8");
        files[relativePath] = content;
      }
    }
  }
};
var templateService = new TemplateService();

// src/services/worker-cluster-manager.ts
var WorkerClusterManager = class {
  static WORKER_REGISTRY_KEY = "multiagent:cluster:workers";
  static HEARTBEAT_TIMEOUT = 5e3;
  /**
   * Get all healthy worker nodes.
   */
  static async getHealthyNodes() {
    const data = await redis.hgetall(this.WORKER_REGISTRY_KEY);
    const now = Date.now();
    return Object.values(data).map((v) => JSON.parse(v)).filter((w) => now - w.lastHeartbeat < this.HEARTBEAT_TIMEOUT && w.status !== "ERROR");
  }
  /**
   * Steer a job to the best available worker.
   */
  static async steerJob(projectId) {
    const nodes = await this.getHealthyNodes();
    const idleNodes = nodes.filter((n) => n.status === "IDLE").sort((a, b) => a.load - b.load);
    if (idleNodes.length === 0) {
      logger_default.warn("[WorkerClusterManager] No idle nodes available in cluster");
      return null;
    }
    const selectedNode = idleNodes[0];
    await redis.publish(`worker:trigger:${selectedNode.workerId}`, JSON.stringify({
      projectId,
      assignedAt: Date.now()
    }));
    logger_default.info({ workerId: selectedNode.workerId, projectId }, "[WorkerClusterManager] Job steered successfully");
    return selectedNode.workerId;
  }
  /**
   * Register or update a worker node's heartbeat.
   */
  static async heartbeat(node) {
    const updatedNode = {
      ...node,
      lastHeartbeat: Date.now()
    };
    await redis.hset(this.WORKER_REGISTRY_KEY, node.workerId, JSON.stringify(updatedNode));
  }
};

// src/lib/index.ts
var lib_exports = {};
__export(lib_exports, {
  QUEUE_ARCHITECTURE: () => QUEUE_ARCHITECTURE,
  QUEUE_DEPLOY: () => QUEUE_DEPLOY,
  QUEUE_DOCKER: () => QUEUE_DOCKER,
  QUEUE_GENERATOR: () => QUEUE_GENERATOR,
  QUEUE_META: () => QUEUE_META,
  QUEUE_PLANNER: () => QUEUE_PLANNER,
  QUEUE_REPAIR: () => QUEUE_REPAIR,
  QUEUE_SUPERVISOR: () => QUEUE_SUPERVISOR,
  QUEUE_VALIDATOR: () => QUEUE_VALIDATOR,
  SYSTEM_QUEUE_NAME: () => SYSTEM_QUEUE_NAME,
  architectureEvents: () => architectureEvents,
  architectureQueue: () => architectureQueue,
  deployEvents: () => deployEvents,
  deployQueue: () => deployQueue,
  dockerEvents: () => dockerEvents,
  dockerQueue: () => dockerQueue,
  env: () => env2,
  generatorEvents: () => generatorEvents,
  generatorQueue: () => generatorQueue,
  metaEvents: () => metaEvents,
  metaQueue: () => metaQueue,
  plannerEvents: () => plannerEvents,
  plannerQueue: () => plannerQueue,
  repairEvents: () => repairEvents,
  repairQueue: () => repairQueue,
  setupSystemJobs: () => setupSystemJobs,
  socketManager: () => socketManager,
  supervisorEvents: () => supervisorEvents,
  supervisorQueue: () => supervisorQueue,
  systemQueue: () => systemQueue,
  validatorEvents: () => validatorEvents,
  validatorQueue: () => validatorQueue
});

// src/lib/env.ts
import { z as z2 } from "zod";
var envSchema = z2.object({
  NODE_ENV: z2.enum(["development", "test", "production"]).default("development"),
  PORT: z2.coerce.number().default(3e3),
  REDIS_URL: z2.string().url().default("redis://localhost:6379"),
  GROQ_API_KEY: z2.string().min(1, "GROQ API key is required"),
  NEXT_PUBLIC_SUPABASE_URL: z2.string().url("Supabase URL is required"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z2.string().min(1, "Supabase Anon Key is required"),
  SUPABASE_SERVICE_ROLE_KEY: z2.string().min(1, "Supabase Service Role is required"),
  STRIPE_SECRET_KEY: z2.string().min(1, "Stripe Secret Key is required").optional(),
  STRIPE_WEBHOOK_SECRET: z2.string().min(1, "Stripe Webhook Secret is required").optional(),
  WORKER_CONCURRENCY: z2.coerce.number().default(5),
  METRICS_TOKEN: z2.string().min(1, "Metrics Authorization Token is required").default("generate-a-secure-token-here"),
  GITHUB_CLIENT_ID: z2.string().min(1, "GitHub Client ID is required for push integration").optional(),
  GITHUB_CLIENT_SECRET: z2.string().min(1, "GitHub Client Secret is required for push integration").optional()
});
var _env;
try {
  _env = envSchema.parse(process.env);
} catch (err) {
  if (err instanceof z2.ZodError) {
    logger_default.fatal(
      { issues: err.issues },
      "Environment validation failed. Missing or invalid required variables."
    );
    process.exit(1);
  }
  throw err;
}
var env2 = _env;

// src/lib/agent-queues.ts
import { Queue as Queue3, QueueEvents as QueueEvents2 } from "bullmq";
var QUEUE_PLANNER = "planner-queue";
var QUEUE_ARCHITECTURE = "architecture-queue";
var QUEUE_GENERATOR = "generator-queue";
var QUEUE_VALIDATOR = "validator-queue";
var QUEUE_DOCKER = "docker-queue";
var QUEUE_DEPLOY = "deploy-queue";
var QUEUE_SUPERVISOR = "supervisor-queue";
var QUEUE_REPAIR = "repair-queue";
var QUEUE_META = "meta-agent-queue";
var connection2 = redis_default;
var defaultOptions2 = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 5e3
  },
  removeOnComplete: false,
  removeOnFail: {
    age: 24 * 3600
    // keep for 24 hours
  }
};
var plannerQueue = new Queue3(QUEUE_PLANNER, { connection: connection2, defaultJobOptions: defaultOptions2 });
var architectureQueue = new Queue3(QUEUE_ARCHITECTURE, { connection: connection2, defaultJobOptions: defaultOptions2 });
var generatorQueue = new Queue3(QUEUE_GENERATOR, { connection: connection2, defaultJobOptions: defaultOptions2 });
var validatorQueue = new Queue3(QUEUE_VALIDATOR, { connection: connection2, defaultJobOptions: defaultOptions2 });
var dockerQueue = new Queue3(QUEUE_DOCKER, { connection: connection2, defaultJobOptions: defaultOptions2 });
var deployQueue = new Queue3(QUEUE_DEPLOY, { connection: connection2, defaultJobOptions: defaultOptions2 });
var supervisorQueue = new Queue3(QUEUE_SUPERVISOR, { connection: connection2, defaultJobOptions: defaultOptions2 });
var repairQueue = new Queue3(QUEUE_REPAIR, { connection: connection2, defaultJobOptions: defaultOptions2 });
var metaQueue = new Queue3(QUEUE_META, { connection: connection2, defaultJobOptions: defaultOptions2 });
var plannerEvents = new QueueEvents2(QUEUE_PLANNER, { connection: connection2 });
var architectureEvents = new QueueEvents2(QUEUE_ARCHITECTURE, { connection: connection2 });
var generatorEvents = new QueueEvents2(QUEUE_GENERATOR, { connection: connection2 });
var validatorEvents = new QueueEvents2(QUEUE_VALIDATOR, { connection: connection2 });
var dockerEvents = new QueueEvents2(QUEUE_DOCKER, { connection: connection2 });
var deployEvents = new QueueEvents2(QUEUE_DEPLOY, { connection: connection2 });
var supervisorEvents = new QueueEvents2(QUEUE_SUPERVISOR, { connection: connection2 });
var repairEvents = new QueueEvents2(QUEUE_REPAIR, { connection: connection2 });
var metaEvents = new QueueEvents2(QUEUE_META, { connection: connection2 });
logger_default.info(`Autonomous Distributed Queues initialized: Planner, Architecture, Generator, Validator, Docker, Deploy, Supervisor, Repair, Meta`);

// src/lib/system-queue.ts
import { Queue as Queue4, Worker } from "bullmq";
async function reconcileBilling() {
  return { success: true };
}
var SYSTEM_QUEUE_NAME = "system-maintenance-v1";
var systemQueue = new Queue4(SYSTEM_QUEUE_NAME, {
  connection: redis_default,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: false
    // Keep failures for audit
  }
});
var systemWorker = new Worker(
  SYSTEM_QUEUE_NAME,
  async (job) => {
    if (job.name === "reconcile-billing") {
      return await reconcileBilling();
    }
  },
  { connection: redis_default }
);
async function setupSystemJobs() {
  await systemQueue.add(
    "reconcile-billing",
    {},
    {
      repeat: {
        pattern: "0 * * * *"
        // Hourly (at the start of every hour)
      },
      jobId: "reconcile-billing-hourly"
    }
  );
  logger_default.info("Hourly billing reconciliation job scheduled.");
}
systemWorker.on("completed", (job) => {
  logger_default.info({ jobId: job.id, jobName: job.name }, "System job completed");
});
systemWorker.on("failed", (job, err) => {
  logger_default.error({ jobId: job?.id, jobName: job?.name, err }, "System job failed");
});

// src/lib/socketManager.ts
import io from "socket.io-client";
var SocketManager = class _SocketManager {
  static instance;
  socket = null;
  serverUrl = typeof window !== "undefined" ? process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3010" : "http://localhost:3010";
  isConnected = false;
  isConnecting = false;
  serverAvailable = null;
  connectionAttempts = 0;
  maxRetries = 5;
  retryTimeout = null;
  healthCheckInterval = null;
  listeners = /* @__PURE__ */ new Set();
  updateListeners = /* @__PURE__ */ new Map();
  constructor() {
  }
  static getInstance() {
    if (!_SocketManager.instance) {
      _SocketManager.instance = new _SocketManager();
    }
    return _SocketManager.instance;
  }
  notifyConnectionState() {
    this.listeners.forEach((listener) => listener(this.isConnected));
  }
  addConnectionListener(listener) {
    this.listeners.add(listener);
    listener(this.isConnected);
    return () => this.listeners.delete(listener);
  }
  addUpdateListener(event, listener) {
    if (!this.updateListeners.has(event)) {
      this.updateListeners.set(event, /* @__PURE__ */ new Set());
      if (this.socket) {
        this.socket.on(event, (data) => this.notifyUpdateListeners(event, data));
      }
    }
    this.updateListeners.get(event).add(listener);
    return () => {
      const listeners = this.updateListeners.get(event);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.updateListeners.delete(event);
          if (this.socket) {
            this.socket.off(event);
          }
        }
      }
    };
  }
  notifyUpdateListeners(event, data) {
    const listeners = this.updateListeners.get(event);
    if (listeners) {
      listeners.forEach((listener) => listener(data));
    }
  }
  async checkServerHealth() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2e3);
      const response = await fetch(`${this.serverUrl}/health`, {
        signal: controller.signal,
        method: "GET"
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        const data = await response.json();
        return data.status === "ok";
      }
      return false;
    } catch {
      return false;
    }
  }
  connectionPromise = null;
  async connect(options) {
    if (options?.serverUrl) {
      this.serverUrl = options.serverUrl;
    }
    if (this.socket && this.isConnected) {
      return this.socket;
    }
    if (this.connectionPromise) {
      console.log("[SocketManager] Reusing existing connection promise");
      return this.connectionPromise;
    }
    this.connectionPromise = (async () => {
      this.isConnecting = true;
      try {
        const isHealthy = await this.checkServerHealth();
        this.serverAvailable = isHealthy;
        if (!isHealthy) {
          console.warn(`[SocketManager] Server at ${this.serverUrl} is unreachable.`);
          this.scheduleRetry();
          return null;
        }
        if (this.retryTimeout) {
          clearTimeout(this.retryTimeout);
          this.retryTimeout = null;
        }
        if (this.socket) {
          this.socket.removeAllListeners();
          this.socket.disconnect();
        }
        console.log(`[SocketManager] Initializing socket connection to ${this.serverUrl}`);
        this.socket = io(this.serverUrl, {
          reconnection: false,
          timeout: 5e3,
          transports: ["websocket", "polling"]
        });
        this.setupSocketListeners();
        return this.socket;
      } catch (error) {
        console.error("[SocketManager] Connection error:", error);
        this.scheduleRetry();
        return null;
      } finally {
        this.isConnecting = false;
        this.connectionPromise = null;
      }
    })();
    return this.connectionPromise;
  }
  setupSocketListeners() {
    if (!this.socket) return;
    this.socket.on("connect", () => {
      console.log("[SocketManager] Connected successfully");
      this.isConnected = true;
      this.isConnecting = false;
      this.connectionAttempts = 0;
      this.serverAvailable = true;
      this.notifyConnectionState();
      this.startHealthMonitoring();
      this.updateListeners.forEach((_, event) => {
        if (this.socket) {
          this.socket.off(event);
          this.socket.on(event, (data) => this.notifyUpdateListeners(event, data));
        }
      });
    });
    this.socket.on("disconnect", (reason) => {
      console.log(`[SocketManager] Disconnected: ${reason}`);
      this.isConnected = false;
      this.notifyConnectionState();
      if (reason === "io server disconnect" || reason === "transport close" || reason === "ping timeout") {
        this.stopHealthMonitoring();
        this.scheduleRetry();
      }
    });
    this.socket.on("connect_error", (error) => {
      console.warn(`[SocketManager] Connect error: ${error.message}`);
      this.isConnected = false;
      this.isConnecting = false;
      this.socket?.disconnect();
      this.scheduleRetry();
    });
  }
  scheduleRetry() {
    if (this.connectionAttempts >= this.maxRetries) {
      console.error(`[SocketManager] Max auto-retries (${this.maxRetries}) reached. Giving up until manual reconnect.`);
      return;
    }
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
    this.connectionAttempts++;
    const backoffMs = Math.min(1e3 * Math.pow(2, this.connectionAttempts), 1e4);
    console.log(`[SocketManager] Scheduling retry ${this.connectionAttempts}/${this.maxRetries} in ${backoffMs}ms`);
    this.retryTimeout = setTimeout(() => {
      this.isConnecting = false;
      this.connect();
    }, backoffMs);
  }
  startHealthMonitoring() {
    this.stopHealthMonitoring();
    this.healthCheckInterval = setInterval(async () => {
      if (this.isConnected) {
        const isHealthy = await this.checkServerHealth();
        if (!isHealthy) {
          console.warn("[SocketManager] Health check failed while connected. Forcing disconnect.");
          this.socket?.disconnect();
        }
      }
    }, 15e3);
  }
  stopHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
  disconnect() {
    this.stopHealthMonitoring();
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    if (this.socket) {
      console.log("[SocketManager] Manually disconnecting");
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.isConnecting = false;
    this.connectionAttempts = 0;
    this.notifyConnectionState();
  }
  emit(event, data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
      return true;
    }
    return false;
  }
  getSocket() {
    return this.socket;
  }
};
var socketManager = SocketManager.getInstance();
export {
  COST_PER_1M_TOKENS,
  CostGovernanceService,
  DEFAULT_GOVERNANCE_CONFIG,
  EjectSystem,
  MemoryPlane,
  Orchestrator,
  PLAN_LIMITS,
  ProjectStateManager,
  QueueManager,
  SemanticCacheService,
  StageState,
  StageStateMachine,
  StrategyEngine,
  activeBuildsGauge,
  agentExecutionDuration,
  agentFailuresTotal,
  apiRequestDurationSeconds,
  config_exports as config,
  eventBus,
  executionFailureTotal,
  executionSuccessTotal,
  getLatestBuildState,
  independentRedisClients,
  lib_exports as lib,
  lockExpiredTotal,
  lockExtensionTotal,
  logger_default as logger,
  memoryPlane,
  missionController,
  nodeCpuUsage,
  nodeMemoryUsage,
  publishBuildEvent,
  queueLengthGauge,
  queueManager,
  queueWaitTimeSeconds,
  readBuildEvents,
  recordBuildMetrics,
  redis,
  registry,
  retryCountTotal,
  runtimeActiveTotal,
  runtimeCrashesTotal,
  runtimeEvictionsTotal,
  runtimeProxyErrorsTotal,
  runtimeStartupDuration,
  services_exports as services,
  stateManager,
  stripeWebhookEventsTotal,
  stuckBuildsTotal,
  workerTaskDurationSeconds
};
//# sourceMappingURL=index.mjs.map