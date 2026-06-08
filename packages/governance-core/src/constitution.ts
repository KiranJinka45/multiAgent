/**
 * Nexus ZTAN Institutional Constitution
 * (v2026.LTS.1)
 */

export interface ConstitutionContext {
    blastRadiusScore?: number;
    rollbackPlan?: { method: string };
    evidenceCount?: number;
    epochMatch?: boolean;
    [key: string]: unknown;
}

export interface ConstitutionalRule {
    id: string;
    description: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
    evaluator: (context: ConstitutionContext) => boolean;
}

export const INSTITUTIONAL_CONSTITUTION: ConstitutionalRule[] = [
    {
        id: 'BR-001',
        description: 'Mandatory Blast Radius Limit: No mutation may exceed a 0.6 impact score without Tier-3 approval.',
        severity: 'CRITICAL',
        evaluator: (ctx) => (ctx.blastRadiusScore || 0) <= 0.6
    },
    {
        id: 'RB-001',
        description: 'Mandatory Rollback Path: All infrastructure mutations must include a deterministic rollback plan.',
        severity: 'CRITICAL',
        evaluator: (ctx) => !!ctx.rollbackPlan && ctx.rollbackPlan.method !== 'NONE'
    },
    {
        id: 'EV-001',
        description: 'Evidence Density: Every mutation must generate at least 3 cryptographically signed evidence items.',
        severity: 'HIGH',
        evaluator: (ctx) => (ctx.evidenceCount || 0) >= 3
    },
    {
        id: 'ID-001',
        description: 'Identity Finality: All execution agents must be bound to the current TRUST_EPOCH.',
        severity: 'CRITICAL',
        evaluator: (ctx) => ctx.epochMatch === true
    }
];
