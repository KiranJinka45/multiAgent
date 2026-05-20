export interface TenantExecutionBoundary {
    tenantId: string;
    executionNamespace: string;
    vectorStorePartition: string;
    cryptographicIdentity: string;
    auditChainRoot: string;
}
/**
 * 🏰 TenantExecutionController
 * Enforces mathematical and operational isolation between tenants.
 * Prevents cross-tenant leakage in execution, memory, and audit lineages.
 */
export declare class TenantExecutionController {
    private boundaries;
    /**
     * Initializes or retrieves an isolated execution boundary for a tenant.
     */
    getBoundary(tenantId: string): Promise<TenantExecutionBoundary>;
    /**
     * Verifies if an operation is authorized for a specific tenant boundary.
     * Prevents cross-tenant "bleed" during execution.
     */
    validateOperation(tenantId: string, targetTenantId: string): boolean;
    /**
     * Generates a tenant-scoped isolation context for child processes.
     */
    getIsolationContext(tenantId: string): Record<string, string>;
}
export declare const isolationController: TenantExecutionController;
//# sourceMappingURL=TenantExecutionController.d.ts.map