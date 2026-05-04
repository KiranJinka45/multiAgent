/**
 * Request Context Re-export
 * Centralized in @packages/observability.
 *
 * NOTE: Explicit re-exports prevent tsc --emitDeclarationOnly from
 * resolving observability source files (rootDir violation in Docker).
 */
export { contextStorage, getRequestId, getTenantId, type RequestContext } from '@packages/observability';
//# sourceMappingURL=context.d.ts.map