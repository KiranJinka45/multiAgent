export type ExecutionCapability = 'db_write' | 'network_out' | 'fs_read' | 'fs_write' | 'subprocess';

export class ExecutionCapabilityRegistry {
    private allowedCapabilities = new Set<ExecutionCapability>();

    constructor(initialCapabilities: ExecutionCapability[] = []) {
        for (const cap of initialCapabilities) {
            this.allowedCapabilities.add(cap);
        }
    }

    /**
     * Registers a new capability dynamically (subject to design limits).
     */
    public registerCapability(capability: ExecutionCapability): void {
        this.allowedCapabilities.add(capability);
    }

    /**
     * Revokes a capability.
     */
    public revokeCapability(capability: ExecutionCapability): void {
        this.allowedCapabilities.delete(capability);
    }

    /**
     * Asserts whether a capability is permitted.
     */
    public hasCapability(capability: ExecutionCapability): boolean {
        return this.allowedCapabilities.has(capability);
    }

    /**
     * Audit whether all requested task capabilities are authorized.
     */
    public auditRequestedCapabilities(requested: ExecutionCapability[]): { authorized: boolean; unauthorizedCapabilities: ExecutionCapability[] } {
        const unauthorizedCapabilities: ExecutionCapability[] = [];
        for (const cap of requested) {
            if (!this.allowedCapabilities.has(cap)) {
                unauthorizedCapabilities.push(cap);
            }
        }

        return {
            authorized: unauthorizedCapabilities.length === 0,
            unauthorizedCapabilities
        };
    }
}
