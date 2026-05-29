export interface VmQuotas {
    memorySizeMb: number;
    vcpuCount: number;
    executionTimeoutMs: number;
}

export class VmConstraintViolationError extends Error {
    constructor(message: string) {
        super(`[VM_LIMIT_VIOLATION] ${message}`);
        this.name = 'VmConstraintViolationError';
    }
}

export class VmConstraintMonitor {
    static readonly DEFAULT_QUOTAS: VmQuotas = {
        memorySizeMb: 512,
        vcpuCount: 1,
        executionTimeoutMs: 30000 // 30 seconds baseline
    };

    /**
     * Asserts that requested limits do not exceed maximum safe bounds.
     */
    static assertSafeQuotas(requested: Partial<VmQuotas>): VmQuotas {
        const quotas = { ...this.DEFAULT_QUOTAS, ...requested };
        
        if (quotas.memorySizeMb > 2048) {
            throw new VmConstraintViolationError(`Requested memory ${quotas.memorySizeMb}MB exceeds maximum 2048MB boundary.`);
        }
        
        if (quotas.vcpuCount > 4) {
            throw new VmConstraintViolationError(`Requested vCPUs ${quotas.vcpuCount} exceeds maximum 4 boundary.`);
        }
        
        if (quotas.executionTimeoutMs > 300000) { // 5 mins max
            throw new VmConstraintViolationError(`Execution timeout ${quotas.executionTimeoutMs}ms exceeds maximum boundary.`);
        }
        
        return quotas;
    }
}
