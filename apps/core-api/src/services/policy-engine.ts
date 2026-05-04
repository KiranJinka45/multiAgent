import { SreAction } from './actuation-controller';
import { logger } from '@packages/observability';

export interface PolicyRule {
    id: string;
    description: string;
    enabled: boolean;
    evaluate: (action: SreAction, context: PolicyContext) => PolicyResult;
}

export interface PolicyContext {
    lastActionTime: number;
    cooldownMs: number;
    activeIncidents: number;
}

export interface PolicyResult {
    allowed: boolean;
    reason?: string;
}

export class PolicyEngine {
    private rules: Map<string, PolicyRule> = new Map();

    constructor() {
        this.registerDefaultRules();
    }

    private registerDefaultRules() {
        this.registerRule({
            id: 'BlockActionOnLowTrust',
            description: 'Rejects non-HALT actions if systemTrust is LOW',
            enabled: true,
            evaluate: (action) => {
                if (action.systemTrust === 'LOW' && action.type !== 'HALT') {
                    return { allowed: false, reason: 'System trust is LOW; only HALT actions are permitted.' };
                }
                return { allowed: true };
            }
        });

        this.registerRule({
            id: 'RequireHighConfidence',
            description: 'Rejects actions if confidence is below 85%',
            enabled: true,
            evaluate: (action) => {
                if (action.confidence < 0.85) {
                    return { allowed: false, reason: `Confidence ${action.confidence.toFixed(2)} is below the 0.85 threshold.` };
                }
                return { allowed: true };
            }
        });

        this.registerRule({
            id: 'PreventOscillation',
            description: 'Rejects actions if within the cooldown window',
            enabled: true,
            evaluate: (action, context) => {
                if ((Date.now() - context.lastActionTime) < context.cooldownMs) {
                    return { allowed: false, reason: 'Action triggered during the cooldown stabilization window.' };
                }
                return { allowed: true };
            }
        });

        this.registerRule({
            id: 'LimitBlastRadius',
            description: 'Prevents scaling beyond maximum allowed replicas',
            enabled: true,
            evaluate: (action) => {
                const MAX_REPLICAS = 10;
                if (action.type === 'SCALE_UP' && action.replicas && action.replicas > MAX_REPLICAS) {
                    return { allowed: false, reason: `Requested replicas (${action.replicas}) exceeds maximum allowed (${MAX_REPLICAS}).` };
                }
                return { allowed: true };
            }
        });
    }

    public registerRule(rule: PolicyRule) {
        this.rules.set(rule.id, rule);
        logger.info({ ruleId: rule.id }, '[PolicyEngine] Rule registered/updated');
    }

    public disableRule(ruleId: string) {
        const rule = this.rules.get(ruleId);
        if (rule) {
            rule.enabled = false;
            logger.warn({ ruleId }, '[PolicyEngine] Rule disabled');
        }
    }

    public enableRule(ruleId: string) {
        const rule = this.rules.get(ruleId);
        if (rule) {
            rule.enabled = true;
            logger.info({ ruleId }, '[PolicyEngine] Rule enabled');
        }
    }

    public getRules(): Omit<PolicyRule, 'evaluate'>[] {
        return Array.from(this.rules.values()).map(r => ({
            id: r.id,
            description: r.description,
            enabled: r.enabled
        }));
    }

    public evaluateAction(action: SreAction, context: PolicyContext): PolicyResult {
        for (const rule of this.rules.values()) {
            if (!rule.enabled) continue;

            const result = rule.evaluate(action, context);
            if (!result.allowed) {
                logger.warn({ actionId: action.id, ruleId: rule.id, reason: result.reason }, '[PolicyEngine] Action blocked by policy');
                return result; // Fail fast on first rejection
            }
        }
        return { allowed: true };
    }
}

export const policyEngine = new PolicyEngine();
