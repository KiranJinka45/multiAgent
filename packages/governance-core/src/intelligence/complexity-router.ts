export type ModelTier = 'GEMINI_FLASH' | 'GEMINI_PRO' | 'CLAUDE_SONNET' | 'CLAUDE_OPUS';

export interface RouteAttestation {
    prompt: string;
    assignedTier: ModelTier;
    reason: string;
}

export class ComplexityRouter {
    private static readonly AGENT_TIER_MAP: Record<string, ModelTier> = {
        // GEMINI_FLASH (Simple tasks)
        'file-read': 'GEMINI_FLASH',
        'file-write': 'GEMINI_FLASH',
        'logger': 'GEMINI_FLASH',
        'query': 'GEMINI_FLASH',
        'tracer': 'GEMINI_FLASH',
        
        // GEMINI_PRO (Moderate tasks)
        'data-parser': 'GEMINI_PRO',
        'configurer': 'GEMINI_PRO',
        'rest-client': 'GEMINI_PRO',
        'database-query': 'GEMINI_PRO',
        'cache-manager': 'GEMINI_PRO',
        
        // CLAUDE_SONNET (Complex generation)
        'code-generator': 'CLAUDE_SONNET',
        'test-runner': 'CLAUDE_SONNET',
        'vulnerability-scanner': 'CLAUDE_SONNET',
        'refactor-assistant': 'CLAUDE_SONNET',
        'optimizer': 'CLAUDE_SONNET',
        
        // CLAUDE_OPUS (Architecture & strategy)
        'system-designer': 'CLAUDE_OPUS',
        'coordinator': 'CLAUDE_OPUS',
        'architect': 'CLAUDE_OPUS',
        'threat-modeler': 'CLAUDE_OPUS',
        'consensus-manager': 'CLAUDE_OPUS'
    };

    /**
     * Statically evaluates the complexity of a task based on heuristics 
     * and agent/worker types to route to one of the 4 model tiers.
     */
    static routeObjective(prompt: string, agentType?: string): RouteAttestation {
        const lowerPrompt = prompt.toLowerCase();
        
        // If an explicit agent type is passed and matches our 20 types:
        if (agentType && this.AGENT_TIER_MAP[agentType]) {
            const tier = this.AGENT_TIER_MAP[agentType];
            return {
                prompt,
                assignedTier: tier,
                reason: `Explicit agent type '${agentType}' mapped directly to tier ${tier}.`
            };
        }

        // Check if any agent type name matches keywords in the prompt to infer agent type
        for (const [type, tier] of Object.entries(this.AGENT_TIER_MAP)) {
            if (lowerPrompt.includes(type)) {
                return {
                    prompt,
                    assignedTier: tier,
                    reason: `Inferred agent type '${type}' from prompt mapped to tier ${tier}.`
                };
            }
        }

        // Otherwise fallback to heuristic keyword routing
        const architectureStrategyIndicators = ['architecture', 'strategy', 'design system', 'coordinate', 'threat model', 'consensus'];
        const complexGenIndicators = ['generate code', 'test suite', 'write tests', 'refactor', 'optimize'];
        const moderateIndicators = ['parse', 'configurer', 'rest api', 'database-query', 'cache-manager'];

        if (architectureStrategyIndicators.some(ind => lowerPrompt.includes(ind))) {
            return {
                prompt,
                assignedTier: 'CLAUDE_OPUS',
                reason: 'Prompt contains architectural/coordination keywords requiring strategic reasoning.'
            };
        }

        if (complexGenIndicators.some(ind => lowerPrompt.includes(ind))) {
            return {
                prompt,
                assignedTier: 'CLAUDE_SONNET',
                reason: 'Prompt contains generation or testing keywords requiring advanced coding capabilities.'
            };
        }

        if (moderateIndicators.some(ind => lowerPrompt.includes(ind))) {
            return {
                prompt,
                assignedTier: 'GEMINI_PRO',
                reason: 'Prompt contains keywords indicating configuration, parsing, or API client logic.'
            };
        }

        return {
            prompt,
            assignedTier: 'GEMINI_FLASH',
            reason: 'Fallback to default entry tier for simple, low-complexity objectives.'
        };
    }
}
