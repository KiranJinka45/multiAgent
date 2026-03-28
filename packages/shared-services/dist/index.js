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
  QUEUE_ARCHITECT: () => QUEUE_ARCHITECT,
  QUEUE_BACKEND: () => QUEUE_BACKEND,
  QUEUE_DEPLOY: () => QUEUE_DEPLOY,
  QUEUE_DOCKER: () => QUEUE_DOCKER,
  QUEUE_FREE: () => QUEUE_FREE,
  QUEUE_FRONTEND: () => QUEUE_FRONTEND,
  QUEUE_GENERATOR: () => QUEUE_GENERATOR,
  QUEUE_META: () => QUEUE_META,
  QUEUE_PLANNER: () => QUEUE_PLANNER,
  QUEUE_PRO: () => QUEUE_PRO,
  QUEUE_REPAIR: () => QUEUE_REPAIR,
  QUEUE_SUPERVISOR: () => QUEUE_SUPERVISOR,
  QUEUE_VALIDATE: () => QUEUE_VALIDATE,
  QUEUE_WATCHDOG: () => QUEUE_WATCHDOG,
  default: () => redis,
  eventBus: () => eventBus,
  queue: () => queue,
  redis: () => redis
});
module.exports = __toCommonJS(index_exports);

// src/queue-constants.ts
var QUEUE_FREE = "build-free";
var QUEUE_PRO = "build-pro";
var QUEUE_DEPLOY = "deployment";
var QUEUE_ARCHITECT = "architect";
var QUEUE_REPAIR = "repair";
var QUEUE_VALIDATE = "validate";
var QUEUE_PLANNER = "planner";
var QUEUE_SUPERVISOR = "supervisor";
var QUEUE_WATCHDOG = "watchdog";
var QUEUE_GENERATOR = "generator";
var QUEUE_DOCKER = "docker";
var QUEUE_BACKEND = "backend";
var QUEUE_FRONTEND = "frontend";
var QUEUE_META = "meta-agent";

// src/redis.ts
var import_ioredis = __toESM(require("ioredis"));
var import_server = require("@packages/utils/server");
var redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
var redis = (0, import_server.createLazyProxy)(() => {
  return new import_ioredis.default(redisUrl, {
    maxRetriesPerRequest: null
  });
}, "Redis_Shared");

// src/event-bus.ts
var import_observability = require("@packages/observability");
var eventBus = {
  async progress(executionId, progress, message) {
    import_observability.logger.info({ executionId, progress, message }, "[EventBus] Progress Update");
  },
  async stage(executionId, stage, status, message, progress, projectId) {
    import_observability.logger.info({ executionId, stage, status, message, progress, projectId }, "[EventBus] Stage Update");
  },
  async thought(executionId, agent, thought) {
    import_observability.logger.info({ executionId, agent, thought }, "[EventBus] Agent Thought");
  },
  async error(executionId, message) {
    import_observability.logger.error({ executionId, message }, "[EventBus] Build Error");
  },
  async complete(executionId, previewUrl, metadata) {
    import_observability.logger.info({ executionId, previewUrl, metadata }, "[EventBus] Build Complete");
  }
};

// src/queue.ts
var queue = {
  add: async (job) => {
    console.log("Queue job:", job);
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  QUEUE_ARCHITECT,
  QUEUE_BACKEND,
  QUEUE_DEPLOY,
  QUEUE_DOCKER,
  QUEUE_FREE,
  QUEUE_FRONTEND,
  QUEUE_GENERATOR,
  QUEUE_META,
  QUEUE_PLANNER,
  QUEUE_PRO,
  QUEUE_REPAIR,
  QUEUE_SUPERVISOR,
  QUEUE_VALIDATE,
  QUEUE_WATCHDOG,
  eventBus,
  queue,
  redis
});
//# sourceMappingURL=index.js.map