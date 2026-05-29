import { SideEffectOntology } from '../ontology/side-effects.js';
import type { OperationDescriptor } from '../ontology/side-effects.js';

export interface PermissionLattice {
    toolName: string;
    tenantScope: string[];
    filesystemScope: string[];
    networkScope: string[];
    runtimeMode: 'sandbox' | 'production' | 'simulation';
    approvalRequirement: boolean;
    payloadLimits: {
        maxSizeBytes: number;
        maxNestingDepth?: number;
    };
    executionTimeLimitsMs: number;
    allowedFileTypes: string[];
    environmentBoundaries: string[];
}

export class PermissionEngine {
    private static latticeRegistry: Map<string, PermissionLattice> = new Map();

    static registerLattice(lattice: PermissionLattice): void {
        this.latticeRegistry.set(lattice.toolName, lattice);
    }

    static evaluateRequest(
        toolName: string,
        tenantId: string,
        networkHost?: string,
        filePath?: string
    ): boolean {
        // Default-deny for unknown tools
        if (!this.latticeRegistry.has(toolName)) {
            console.warn(`[Governance] Execution denied: Tool ${toolName} not found in Permission Lattice.`);
            return false;
        }

        const lattice = this.latticeRegistry.get(toolName)!;

        // Verify Side Effect Ontology matches approval requirements
        let operation: OperationDescriptor;
        try {
            operation = SideEffectOntology.getOperation(toolName);
        } catch (e) {
            console.warn(`[Governance] Execution denied: Tool ${toolName} missing from Side-Effect Ontology.`);
            return false;
        }

        // Irreversible operations MUST have approvalRequirement = true
        if (SideEffectOntology.isIrreversible(toolName) && !lattice.approvalRequirement) {
            console.warn(`[Governance] Execution denied: Irreversible tool ${toolName} lacks strict approval requirement in Lattice.`);
            return false;
        }

        // Evaluate Tenant Scope
        if (lattice.tenantScope.length > 0 && !lattice.tenantScope.includes(tenantId) && !lattice.tenantScope.includes('*')) {
            console.warn(`[Governance] Execution denied: Tenant ${tenantId} not authorized for tool ${toolName}.`);
            return false;
        }

        // Evaluate Network Scope if requested
        if (networkHost) {
            const hostLower = networkHost.toLowerCase().trim();
            const hostPart = hostLower.split(':')[0];
            if (
                hostPart === 'localhost' ||
                hostPart === '::1' ||
                hostPart === '0.0.0.0' ||
                hostPart.startsWith('127.')
            ) {
                console.warn(`[Governance] Execution denied: Loopback/local network host ${networkHost} is strictly blocked.`);
                return false;
            }

            if (lattice.networkScope.length === 0 || (!lattice.networkScope.includes(networkHost) && !lattice.networkScope.includes('*'))) {
                console.warn(`[Governance] Execution denied: Network host ${networkHost} not allowed for tool ${toolName}.`);
                return false;
            }
        }

        // Evaluate Filesystem Scope if requested
        if (filePath) {
            const allowed = lattice.filesystemScope.some(scope => filePath.startsWith(scope) || scope === '*');
            if (!allowed) {
                console.warn(`[Governance] Execution denied: Path ${filePath} not allowed for tool ${toolName}.`);
                return false;
            }
        }

        return true;
    }
}
