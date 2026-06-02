export type ModelTier = 'FAST_TIER' | 'BALANCED_TIER' | 'SMART_TIER' | 'STRATEGIC_TIER';

export interface RouteAttestation {
    prompt: string;
    assignedTier: ModelTier;
    /** The actual LLM provider resolved from environment, not the tier name */
    resolvedProvider: string;
    reason: string;
}

export class ComplexityRouter {
    private static readonly AGENT_TIER_MAP: Record<string, ModelTier> = {
        // FAST_TIER (Simple tasks)
        'file-read': 'FAST_TIER',
        'file-write': 'FAST_TIER',
        'logger': 'FAST_TIER',
        'query': 'FAST_TIER',
        'tracer': 'FAST_TIER',
        
        // BALANCED_TIER (Moderate tasks)
        'data-parser': 'BALANCED_TIER',
        'configurer': 'BALANCED_TIER',
        'rest-client': 'BALANCED_TIER',
        'database-query': 'BALANCED_TIER',
        'cache-manager': 'BALANCED_TIER',
        
        // SMART_TIER (Complex generation)
        'code-generator': 'SMART_TIER',
        'test-runner': 'SMART_TIER',
        'vulnerability-scanner': 'SMART_TIER',
        'refactor-assistant': 'SMART_TIER',
        'optimizer': 'SMART_TIER',
        
        // STRATEGIC_TIER (Architecture & strategy)
        'system-designer': 'STRATEGIC_TIER',
        'coordinator': 'STRATEGIC_TIER',
        'architect': 'STRATEGIC_TIER',
        'threat-modeler': 'STRATEGIC_TIER',
        'consensus-manager': 'STRATEGIC_TIER'
    };

    /**
     * Resolves the actual LLM provider from environment variables.
     * Tier names (GEMINI_FLASH etc.) are abstract capability tiers —
     * this returns the real provider that will service the request.
     */
    private static resolveProvider(): string {
        const provider = process.env.LLM_PROVIDER;
        if (provider) return provider.toUpperCase();
        if (process.env.GROQ_API_KEY) return 'GROQ';
        if (process.env.OPENAI_API_KEY) return 'OPENAI';
        if (process.env.ANTHROPIC_API_KEY) return 'ANTHROPIC';
        if (process.env.GOOGLE_API_KEY) return 'GOOGLE';
        return 'UNKNOWN';
    }

    /**
     * Statically evaluates the complexity of a task based on heuristics 
     * and agent/worker types to route to one of the 4 model tiers.
     */
    static routeObjective(prompt: string, agentType?: string): RouteAttestation {
        const lowerPrompt = prompt.toLowerCase();
        const resolvedProvider = this.resolveProvider();
        
        // If an explicit agent type is passed and matches our 20 types:
        if (agentType && this.AGENT_TIER_MAP[agentType]) {
            const tier = this.AGENT_TIER_MAP[agentType];
            return {
                prompt,
                assignedTier: tier,
                resolvedProvider,
                reason: `Explicit agent type '${agentType}' mapped directly to tier ${tier}.`
            };
        }

        // Check if any agent type name matches keywords in the prompt to infer agent type
        for (const [type, tier] of Object.entries(this.AGENT_TIER_MAP)) {
            if (lowerPrompt.includes(type)) {
                return {
                    prompt,
                    assignedTier: tier,
                    resolvedProvider,
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
                assignedTier: 'STRATEGIC_TIER',
                resolvedProvider,
                reason: 'Prompt contains architectural/coordination keywords requiring strategic reasoning.'
            };
        }

        if (complexGenIndicators.some(ind => lowerPrompt.includes(ind))) {
            return {
                prompt,
                assignedTier: 'SMART_TIER',
                resolvedProvider,
                reason: 'Prompt contains generation or testing keywords requiring advanced coding capabilities.'
            };
        }

        if (moderateIndicators.some(ind => lowerPrompt.includes(ind))) {
            return {
                prompt,
                assignedTier: 'BALANCED_TIER',
                resolvedProvider,
                reason: 'Prompt contains keywords indicating configuration, parsing, or API client logic.'
            };
        }

        return {
            prompt,
            assignedTier: 'FAST_TIER',
            resolvedProvider,
            reason: 'Fallback to default entry tier for simple, low-complexity objectives.'
        };
    }
}

