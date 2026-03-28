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
var import_observability4 = require("@packages/observability");

// src/app.ts
var import_express6 = __toESM(require("express"));
var import_cors = __toESM(require("cors"));

// src/routes/generate.ts
var import_express = require("express");

// src/controllers/generateController.ts
var import_queue = require("@packages/queue");
var import_observability = require("@packages/observability");
var generateApp = async (req, res) => {
  let { prompt, structuredData } = req.body;
  if (structuredData) {
    prompt = `Build a ${structuredData.vibe} ${structuredData.type}. Key features: ${structuredData.features?.join(", ")}. Goal: ${structuredData.customGoal}`;
  }
  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }
  const missionId = `mission_${Date.now()}`;
  import_observability.logger.info({
    missionId,
    prompt,
    source: structuredData ? "structured_form" : "raw_prompt",
    timestamp: Date.now()
  }, "[ANALYTICS] Generation Started");
  await import_queue.buildQueue.add("build:init", {
    missionId,
    prompt
  });
  res.json({ missionId });
};

// src/routes/generate.ts
var router = (0, import_express.Router)();
router.post("/", generateApp);
var generate_default = router;

// src/routes/status.ts
var import_express2 = require("express");

// src/controllers/statusController.ts
var import_server = require("@packages/utils/server");
var getStatus = async (req, res) => {
  const missionId = req.params.missionId;
  const mission = await import_server.missionController.getMission(missionId);
  if (!mission) {
    return res.status(404).json({ error: "Mission not found" });
  }
  res.json(mission);
};

// src/routes/status.ts
var router2 = (0, import_express2.Router)();
router2.get("/:missionId", getStatus);
var status_default = router2;

// src/routes/update.ts
var import_express3 = require("express");

// src/controllers/updateController.ts
var import_queue2 = require("@packages/queue");
var import_server2 = require("@packages/utils/server");
var updateController = async (req, res) => {
  const { missionId, prompt } = req.body;
  if (!missionId || !prompt) {
    return res.status(400).json({ error: "missionId and prompt are required" });
  }
  const mission = await import_server2.missionController.getMission(missionId);
  if (!mission) {
    return res.status(404).json({ error: "Mission not found" });
  }
  const job = await import_queue2.buildQueue.add("build:update", {
    missionId,
    prompt,
    isUpdate: true
  });
  res.json({ missionId, jobId: job.id });
};

// src/routes/update.ts
var router3 = (0, import_express3.Router)();
router3.post("/", updateController);
var update_default = router3;

// src/routes/projects.ts
var import_express4 = require("express");

// src/controllers/projectController.ts
var import_server3 = require("@packages/utils/server");
var PROJECT_PREFIX = "project:";
var USER_PROJECTS_PREFIX = "user_projects:";
var projectController = {
  async list(req, res) {
    const userId = req.headers["x-user-id"] || "default-user";
    const keys = await import_server3.redis.smembers(`${USER_PROJECTS_PREFIX}${userId}`);
    const projects = [];
    for (const key of keys) {
      const data = await import_server3.redis.get(`${PROJECT_PREFIX}${key}`);
      if (data) projects.push(JSON.parse(data));
    }
    res.json(projects);
  },
  async get(req, res) {
    const { projectId } = req.params;
    const data = await import_server3.redis.get(`${PROJECT_PREFIX}${projectId}`);
    if (!data) return res.status(404).json({ error: "Project not found" });
    const project = JSON.parse(data);
    const historyData = await import_server3.redis.lrange(`project_history:${projectId}`, 0, -1);
    const history = historyData.map((h) => JSON.parse(h));
    res.json({ ...project, history });
  },
  async create(req, res) {
    const { name, missionId, prompt } = req.body;
    const userId = req.headers["x-user-id"] || "default-user";
    if (!name || !missionId) return res.status(400).json({ error: "Name and missionId are required" });
    const projectId = `p_${Math.random().toString(36).slice(2, 10)}`;
    const project = {
      id: projectId,
      name,
      userId,
      missionId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    const historyItem = {
      id: `v_${Date.now()}`,
      projectId,
      missionId,
      prompt: prompt || "Initial generation",
      createdAt: Date.now()
    };
    await import_server3.redis.set(`${PROJECT_PREFIX}${projectId}`, JSON.stringify(project));
    await import_server3.redis.sadd(`${USER_PROJECTS_PREFIX}${userId}`, projectId);
    await import_server3.redis.lpush(`project_history:${projectId}`, JSON.stringify(historyItem));
    res.json(project);
  },
  async restore(req, res) {
    const { projectId, versionId } = req.params;
    const historyData = await import_server3.redis.lrange(`project_history:${projectId}`, 0, -1);
    const history = historyData.map((h) => JSON.parse(h));
    const version = history.find((v) => v.id === versionId);
    if (!version) return res.status(404).json({ error: "Version not found" });
    const data = await import_server3.redis.get(`${PROJECT_PREFIX}${projectId}`);
    if (!data) return res.status(404).json({ error: "Project not found" });
    const project = JSON.parse(data);
    project.missionId = version.missionId;
    project.updatedAt = Date.now();
    await import_server3.redis.set(`${PROJECT_PREFIX}${projectId}`, JSON.stringify(project));
    res.json({ success: true, project });
  }
};

// src/routes/projects.ts
var router4 = (0, import_express4.Router)();
router4.get("/", projectController.list);
router4.get("/:projectId", projectController.get);
router4.post("/", projectController.create);
router4.post("/:projectId/restore/:versionId", projectController.restore);
var projects_default = router4;

// src/routes/analytics.ts
var import_express5 = require("express");

// src/services/analytics-service.ts
var import_observability2 = require("@packages/observability");
var import_server4 = require("@packages/utils/server");
var AnalyticsService = class {
  /**
   * Track a view on a shared preview.
   */
  static async trackShareView(previewId, referrer) {
    try {
      const key = `stats:preview:${previewId}:views`;
      await import_server4.redis.incr(key);
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const dailyKey = `stats:daily:${today}:views`;
      await import_server4.redis.incr(dailyKey);
      import_observability2.logger.info({ previewId, referrer }, "[AnalyticsService] Tracked share view");
    } catch (error) {
      import_observability2.logger.error({ error }, "[AnalyticsService] Failed to track view");
    }
  }
  /**
   * Track a remix event on a project.
   */
  static async trackRemix(previewId) {
    try {
      const key = `stats:preview:${previewId}:remixes`;
      await import_server4.redis.incr(key);
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const dailyKey = `stats:daily:${today}:remixes`;
      await import_server4.redis.incr(dailyKey);
      import_observability2.logger.info({ previewId }, "[AnalyticsService] Tracked remix");
    } catch (error) {
      import_observability2.logger.error({ error }, "[AnalyticsService] Failed to track remix");
    }
  }
  /**
   * Track an edit event on a project.
   */
  static async trackEdit(previewId) {
    try {
      const key = `stats:preview:${previewId}:edits`;
      await import_server4.redis.incr(key);
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const dailyKey = `stats:daily:${today}:edits`;
      await import_server4.redis.incr(dailyKey);
      import_observability2.logger.info({ previewId }, "[AnalyticsService] Tracked edit");
    } catch (error) {
      import_observability2.logger.error({ error }, "[AnalyticsService] Failed to track edit");
    }
  }
  /**
   * Track the "wow moment" when a preview first loads.
   */
  static async trackWowMoment(previewId) {
    try {
      const key = `stats:preview:${previewId}:wow`;
      const hasWowed = await import_server4.redis.get(key);
      if (hasWowed) return;
      await import_server4.redis.set(key, "1");
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const dailyKey = `stats:daily:${today}:wow`;
      await import_server4.redis.incr(dailyKey);
      import_observability2.logger.info({ previewId }, "[AnalyticsService] Tracked wow moment");
    } catch (error) {
      import_observability2.logger.error({ error }, "[AnalyticsService] Failed to track wow moment");
    }
  }
  /**
   * Get remix counts for a project.
   */
  static async getRemixCount(previewId) {
    const count = await import_server4.redis.get(`stats:preview:${previewId}:remixes`);
    return count ? parseInt(count, 10) : 0;
  }
};

// src/routes/analytics.ts
var router5 = (0, import_express5.Router)();
router5.post("/wow", async (req, res) => {
  try {
    const { projectId } = req.body;
    if (!projectId) {
      return res.status(400).json({ error: "Project ID is required" });
    }
    await AnalyticsService.trackWowMoment(projectId);
    res.json({ success: true });
  } catch (error) {
    console.error("[Analytics WOW] Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
var analytics_default = router5;

// src/app.ts
var import_server5 = require("@packages/utils/server");
var app = (0, import_express6.default)();
app.use((0, import_cors.default)());
app.use(import_express6.default.json());
app.use((req, res, next) => {
  const end = import_server5.apiRequestDurationSeconds.startTimer();
  res.on("finish", () => {
    end({
      method: req.method,
      route: req.path,
      status_code: res.statusCode.toString()
    });
  });
  next();
});
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: Date.now(), service: "multiagent-api" });
});
app.get("/metrics", async (req, res) => {
  try {
    res.set("Content-Type", import_server5.registry.contentType);
    res.end(await import_server5.registry.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
});
app.use("/generate", generate_default);
app.use("/status", status_default);
app.use("/update", update_default);
app.use("/projects", projects_default);
app.use("/analytics", analytics_default);
var app_default = app;

// src/index.ts
var import_http = require("http");

// src/services/websocket.ts
var import_socket = require("socket.io");
var import_observability3 = require("@packages/observability");
var import_ioredis = __toESM(require("ioredis"));
var io;
var initWebSocket = (server2) => {
  io = new import_socket.Server(server2, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
  const subClient = new import_ioredis.default(process.env.REDIS_URL || "redis://localhost:6379");
  subClient.subscribe("build-events");
  subClient.on("message", (channel, message) => {
    if (channel === "build-events") {
      const event = JSON.parse(message);
      if (event.executionId) {
        io.to(`mission:${event.executionId}`).emit("event", event);
        if (event.type === "thought") {
          io.to(`mission:${event.executionId}`).emit("log", event.message);
        }
        if (event.type === "stage" || event.type === "complete") {
          io.to(`mission:${event.executionId}`).emit("status", { status: event.status, stage: event.currentStage });
        }
      }
    }
  });
  io.on("connection", (socket) => {
    import_observability3.logger.info({ socketId: socket.id }, "[WebSocket] Client connected");
    socket.on("subscribe", (missionId) => {
      import_observability3.logger.info({ socketId: socket.id, missionId }, "[WebSocket] Subscribing to mission");
      socket.join(`mission:${missionId}`);
    });
    socket.on("disconnect", () => {
      import_observability3.logger.info({ socketId: socket.id }, "[WebSocket] Client disconnected");
    });
  });
  return io;
};

// src/index.ts
(0, import_observability4.initInstrumentation)("multiagent-api");
var server = (0, import_http.createServer)(app_default);
initWebSocket(server);
var PORT = parseInt(process.env.PORT || "3001", 10);
server.listen(PORT, "0.0.0.0", () => {
  console.log(`[API] Server running on port ${PORT}`);
});
//# sourceMappingURL=index.js.map