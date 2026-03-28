import { logger } from '@packages/observability';

/**
 * Event Bus (Minimal implementation for standardizing imports)
 * This facilitates the transition from relative imports to @packages/shared-services.
 */
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
  }
};
