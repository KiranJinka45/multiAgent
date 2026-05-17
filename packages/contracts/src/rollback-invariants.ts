/**
 * Rollback Invariants
 * Deterministic safety constraints that must pass before any state restoration.
 */
export interface RollbackInvariants {
    baselineSoftwareVersion: string;  // Minimum safe version for restoration
    prohibitedStates: string[];       // State transitions that are physically/legally impossible
    mandatoryDependencies: string[];  // Dependencies that MUST be healthy before rollback
    maxBlastRadiusNodes: number;      // Maximum number of nodes that can be impacted
}

/**
 * Rollback Impact Assessment
 * The result of evaluating invariants against a specific evidence entry.
 */
export interface RollbackImpactAssessment {
    isSafe: boolean;
    blastRadiusNodes: string[];
    violatedInvariants: string[];
    dependencyHealth: Record<string, 'HEALTHY' | 'DEGRADED' | 'MISSING'>;
    recommendation: 'PROCEED' | 'PROHIBITED' | 'CONDITIONAL';
}
