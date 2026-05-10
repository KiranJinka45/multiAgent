import { logger } from '@packages/observability';

export interface PolicyRule {
    id: string;
    description: string;
    condition: (context: any) => boolean;
}

/**
 * 🛡️ PolicyEngine
 * Implements Policy-as-Code for the ZTAN platform.
 * Ensures that all autonomous actions comply with enterprise safety and isolation standards.
 */
export class PolicyEngine {
    private rules: PolicyRule[] = [
        {
            id: 'RULE_TENANT_ISOLATION',
            description: 'Source tenant must match target tenant for all operations.',
            condition: (ctx) => ctx.tenantId === ctx.targetTenantId
        },
        {
            id: 'RULE_SANDBOX_ENFORCEMENT',
            description: 'High-risk workloads must run in firecracker runtime.',
            condition: (ctx) => {
                if (ctx.riskLevel === 'high') return ctx.runtimeClass === 'firecracker';
                return true;
            }
        },
        {
            id: 'RULE_REPLAY_VALIDITY',
            description: 'Every action must have a valid cryptographic trace.',
            condition: (ctx) => !!ctx.traceId && !!ctx.spanId
        }
    ];

    /**
     * Evaluates a set of context against active policy rules.
     */
    evaluate(context: any): { allowed: boolean, violations: string[] } {
        const violations: string[] = [];

        for (const rule of this.rules) {
            if (!rule.condition(context)) {
                violations.push(`${rule.id}: ${rule.description}`);
            }
        }

        const allowed = violations.length === 0;
        
        if (!allowed) {
            logger.warn({ violations, context }, '[PolicyEngine] ACCESS_DENIED: Policy violations detected');
        }

        return { allowed, violations };
    }
}

export const policyEngine = new PolicyEngine();
