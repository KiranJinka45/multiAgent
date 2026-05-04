import { AsyncLocalStorage } from 'async_hooks';
export interface RequestContext {
    requestId: string;
    userId?: string;
    tenantId?: string;
    executionId?: string;
}
export declare const contextStorage: AsyncLocalStorage<RequestContext>;
/**
 * Helper to get the current request ID from context
 */
export declare function getRequestId(): string | undefined;
/**
 * Helper to get the current user ID from context
 */
export declare function getUserId(): string | undefined;
/**
 * Helper to get the current tenant ID from context
 */
export declare function getTenantId(): string | undefined;
/**
 * Helper to get the current execution ID from context
 */
export declare function getExecutionId(): string | undefined;
/**
 * Helper to get the complete context
 */
export declare function getRequestContext(): RequestContext | undefined;
//# sourceMappingURL=context.d.ts.map