/**
 * Request Context Re-export
 * Centralized in @packages/observability to prevent circular dependencies.
 *
 * NOTE: We use explicit re-exports (not `export *`) to prevent tsc
 * --emitDeclarationOnly from resolving observability source files,
 * which would violate the rootDir constraint during Docker builds.
 */
export { contextStorage, getRequestId, getTenantId, type RequestContext } from '@packages/observability';
//# sourceMappingURL=context.d.ts.map