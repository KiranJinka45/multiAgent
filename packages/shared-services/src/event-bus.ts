import { logger } from '@packages/observability';

/**
 * Event Bus (Minimal implementation for standardizing imports)
 * This facilitates the transition from relative imports to @packages/shared-services.
 */
const agentFn = async (...args: any[]) => {};
(agentFn as any).publish = async (...args: any[]) => {};

export const eventBus = {
  async progress(executionId: string, progress: number, message: string) {
    logger.info({ executionId, progress, message }, '[EventBus] Progress Update');
  },
  async stage(executionId: string, stage: string, status: string, message: string, progress: number, projectId?: string) {
    logger.info({ executionId, stage, status, message, progress, projectId }, '[EventBus] Stage Update');
  },
  async thought(executionId: string, agent: string, thought: string) {
    logger.info({ executionId, agent, thought }, '[EventBus] Agent Thought');
  },
  async error(executionId: string, message: string) {
    logger.error({ executionId, message }, '[EventBus] Build Error');
  },
  async complete(executionId: string, previewUrl?: string, metadata?: Record<string, unknown>) {
    logger.info({ executionId, previewUrl, metadata }, '[EventBus] Build Complete');
  },
  agent: agentFn,
  readBuildEvents: async (executionId: string, lastId: string) => [] as [string, any][],
  getLatestBuildState: async (executionId: string) => null,
  startTimer: async (...args: any[]) => (msg: string) => Promise.resolve(),
};

export const getLatestBuildState = eventBus.getLatestBuildState;
export const readBuildEvents = eventBus.readBuildEvents;

