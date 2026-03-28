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
var import_dotenv = __toESM(require("dotenv"));

// src/orchestrator.ts
var import_utils = require("@packages/utils");
var import_utils2 = require("@packages/utils");
var import_utils3 = require("@packages/utils");
var import_utils4 = require("@packages/utils");
var import_utils5 = __toESM(require("@packages/utils"));
var StageStateMachine = class {
  currentStage = "PLANNING" /* PLANNING */;
  currentState = "IDLE" /* IDLE */;
  executionId;
  projectId;
  constructor(executionId, projectId) {
    this.executionId = executionId;
    this.projectId = projectId;
  }
  async transition(stage, state, message, progress) {
    this.currentStage = stage;
    this.currentState = state;
    import_utils5.default.info({ executionId: this.executionId, stage, state, message }, `[StageStateMachine] Transitioning to ${stage}:${state}`);
    const uiStatus = state === "RUNNING" /* RUNNING */ ? "in_progress" : state === "COMPLETED" /* COMPLETED */ ? "completed" : state === "FAILED" /* FAILED */ ? "failed" : "pending";
    await import_utils3.eventBus.stage(this.executionId, stage.toLowerCase(), uiStatus, message, progress, this.projectId);
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
    const elog = (0, import_utils4.getExecutionLogger)(executionId);
    const fsm = new StageStateMachine(executionId, projectId);
    try {
      elog.info("Dispatching to Temporal Production Pipeline");
      await import_utils2.stateManager.transition(executionId, "created", "Cluster online.", 5, projectId);
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
      await import_utils.missionController.createMission(mission).catch(() => {
      });
      const { Connection, Client, WorkflowIdReusePolicy } = await import("@temporalio/client");
      const connection = await Connection.connect();
      const client = new Client({ connection });
      await fsm.transition("PLANNING" /* PLANNING */, "RUNNING" /* RUNNING */, "Orchestrating Temporal mission...", 10);
      const handle = await client.workflow.start("appBuilderWorkflow", {
        args: [{ prompt: taskPrompt, userId, projectId, executionId, tenantId }],
        taskQueue: "app-builder",
        workflowId: `build-${projectId}-${executionId}`,
        workflowIdReusePolicy: WorkflowIdReusePolicy.WORKFLOW_ID_REUSE_POLICY_REJECT_DUPLICATE
      });
      elog.info(`Workflow started. ID: ${handle.workflowId}`);
      const result = await handle.result();
      await fsm.transition("COMPLETE" /* COMPLETE */, "COMPLETED" /* COMPLETED */, "Project ready via Temporal!", 100);
      return { success: true, executionId, files: [], previewUrl: result.previewUrl, fastPath: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      elog.error({ error: errorMsg }, "Pipeline failed");
      if (fsm) await fsm.transition("FAILED" /* FAILED */, "FAILED" /* FAILED */, errorMsg, 0);
      return { success: false, executionId, error: errorMsg };
    }
  }
};

// src/index.ts
var import_utils6 = require("@packages/utils");
var import_observability = require("@packages/observability");
import_dotenv.default.config();
import_dotenv.default.config();
(0, import_observability.initTelemetry)("multiagent-orchestrator");
var app = express();
var PORT = process.env.PORT || 4001;
var INTERNAL_KEY = process.env.INTERNAL_KEY || "local-secret-key";
var orchestrator = new Orchestrator();
app.use(express.json());
app.use((req, res, next) => {
  const key = req.headers["x-internal-key"];
  if (key !== INTERNAL_KEY) {
    import_utils6.logger.warn({ key }, "[Orchestrator] Unauthorized internal access attempt");
    return res.status(401).json({ error: "Unauthorized: Invalid internal key" });
  }
  next();
});
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", import_utils6.registry.contentType);
  res.end(await import_utils6.registry.metrics());
});
app.post("/run", async (req, res) => {
  const { prompt, userId, projectId, executionId, tenantId } = req.body;
  if (!prompt || !userId || !projectId || !executionId || !tenantId) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  try {
    import_utils6.logger.info({ executionId, projectId, tenantId }, "[Orchestrator] Received build request");
    const result = await orchestrator.run(prompt, userId, projectId, executionId, tenantId);
    res.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    import_utils6.logger.error({ error: msg, executionId }, "[Orchestrator] Workflow initiation failed");
    res.status(500).json({ success: false, error: msg });
  }
});
app.get("/health", (req, res) => {
  res.json({ status: "healthy", service: "orchestrator" });
});
app.listen(PORT, () => {
  import_utils6.logger.info(`[Orchestrator] Service running on port ${PORT}`);
});
//# sourceMappingURL=index.js.map