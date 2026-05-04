import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  requestId: string;
  userId?: string;
  tenantId?: string;
  executionId?: string;
}

export const contextStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Helper to get the current request ID from context
 */
export function getRequestId(): string | undefined {
  return contextStorage.getStore()?.requestId;
}

/**
 * Helper to get the current user ID from context
 */
export function getUserId(): string | undefined {
  return contextStorage.getStore()?.userId;
}

/**
 * Helper to get the current tenant ID from context
 */
export function getTenantId(): string | undefined {
  return contextStorage.getStore()?.tenantId;
}

/**
 * Helper to get the current execution ID from context
 */
export function getExecutionId(): string | undefined {
  return contextStorage.getStore()?.executionId;
}

/**
 * Helper to get the complete context
 */
export function getRequestContext(): RequestContext | undefined {
  return contextStorage.getStore();
}
