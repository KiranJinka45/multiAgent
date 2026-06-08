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
    private static opaUrl = process.env.OPA_URL || 'http://localhost:8181';

    static registerLattice(lattice: PermissionLattice): void {
        this.latticeRegistry.set(lattice.toolName, lattice);
    }

    static async evaluateRequestAsync(
        toolName: string,
        tenantId: string,
        networkHost?: string,
        filePath?: string
    ): Promise<boolean> {
        if (process.env.VITEST === 'true' || process.env.ZTAN_MOCK_OPA === 'true') {
            return this.evaluateRequest(toolName, tenantId, networkHost, filePath);
        }

        if (!this.latticeRegistry.has(toolName)) {
            console.warn(`[Governance] Execution denied: Tool ${toolName} not found in Permission Lattice.`);
            return false;
        }

        const lattice = this.latticeRegistry.get(toolName)!;

        // Verify Side Effect Ontology matches approval requirements
        let _operation: OperationDescriptor;
        try {
            _operation = SideEffectOntology.getOperation(toolName);
        } catch (_e) {
            console.warn(`[Governance] Execution denied: Tool ${toolName} missing from Side-Effect Ontology.`);
            return false;
        }
        
        const isIrreversible = SideEffectOntology.isIrreversible(toolName);

        try {
            const response = await fetch(`${this.opaUrl}/v1/data/ztan/lattice/allow`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    input: {
                        toolName,
                        tenantId,
                        networkHost,
                        filePath,
                        isIrreversible,
                        lattice
                    }
                })
            });

            if (!response.ok) {
                console.error(`[Governance] OPA Sidecar returned HTTP ${response.status}. Defaulting to DENY.`);
                return false;
            }

            const json = await response.json();
            if (json.result === true) {
                return true;
            } else {
                console.warn(`[Governance] OPA Sidecar explicitly denied execution for tool ${toolName}.`);
                return false;
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            console.error(`[Governance] OPA Sidecar unreachable: ${message}. Fail-closed active. Defaulting to DENY.`);
            return false;
        }
    }
    
    // Kept for backward compatibility in tests that haven't moved to async, though it should throw or warn in prod
    static evaluateRequest(
        toolName: string,
        tenantId: string,
        networkHost?: string,
        filePath?: string
    ): boolean {
        console.warn('[Governance] Synchronous evaluateRequest called. OPA requires async. Falling back to local strict TS evaluation for test compatibility.');
        
        if (!this.latticeRegistry.has(toolName)) return false;
        const lattice = this.latticeRegistry.get(toolName)!;
        let _operation: OperationDescriptor;
        try { _operation = SideEffectOntology.getOperation(toolName); } catch (_e) { return false; }
        
        if (SideEffectOntology.isIrreversible(toolName) && !lattice.approvalRequirement) return false;
        if (lattice.tenantScope.length > 0 && !lattice.tenantScope.includes(tenantId) && !lattice.tenantScope.includes('*')) return false;
        if (networkHost) {
            const hostLower = networkHost.toLowerCase().trim();
            const hostPart = hostLower.split(':')[0];
            if (hostPart === 'localhost' || hostPart === '::1' || hostPart === '0.0.0.0' || hostPart.startsWith('127.')) return false;
            if (lattice.networkScope.length === 0 || (!lattice.networkScope.includes(networkHost) && !lattice.networkScope.includes('*'))) return false;
        }
        if (filePath) {
            const allowed = lattice.filesystemScope.some(scope => filePath.startsWith(scope) || scope === '*');
            if (!allowed) return false;
        }
        return true;
    }
}
