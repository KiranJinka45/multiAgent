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
import Redis from "ioredis";
import { createLazyProxy } from "@packages/utils/server";
var redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
var redis = createLazyProxy(() => {
  return new Redis(redisUrl, {
    maxRetriesPerRequest: null
  });
}, "Redis_Shared");

// src/event-bus.ts
import { logger } from "@packages/observability";
var eventBus = {
  async progress(executionId, progress, message) {
    logger.info({ executionId, progress, message }, "[EventBus] Progress Update");
  },
  async stage(executionId, stage, status, message, progress, projectId) {
    logger.info({ executionId, stage, status, message, progress, projectId }, "[EventBus] Stage Update");
  },
  async thought(executionId, agent, thought) {
    logger.info({ executionId, agent, thought }, "[EventBus] Agent Thought");
  },
  async error(executionId, message) {
    logger.error({ executionId, message }, "[EventBus] Build Error");
  },
  async complete(executionId, previewUrl, metadata) {
    logger.info({ executionId, previewUrl, metadata }, "[EventBus] Build Complete");
  }
};

// src/queue.ts
var queue = {
  add: async (job) => {
    console.log("Queue job:", job);
  }
};
export {
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
  redis as default,
  eventBus,
  queue,
  redis
};
//# sourceMappingURL=index.mjs.map