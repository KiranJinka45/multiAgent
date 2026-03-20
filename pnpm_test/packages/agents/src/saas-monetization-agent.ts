import { BaseAgent } from '@agents/base-agent';
import { MonetizationParams, AgentRequest, AgentResponse } from '@shared-types/agent-contracts';
import { StrategyConfig } from '@services/agent-intelligence/strategy-engine';

export interface MonetizationOutput {
    stripeConfig: string;
    plans: { name: string; features: string[]; price: string }[];
    usageTracking: string;
    files: { path: string; content: string }[];
}

/**
 * SaaSMonetizationAgent
 * 
 * Implements subscription billing, usage tracking, and access control.
 */
export class SaaSMonetizationAgent extends BaseAgent {
    getName() { return 'SaaSMonetizationAgent'; }

    async execute(
        request: AgentRequest<MonetizationParams>,
        signal?: AbortSignal,
        strategy?: StrategyConfig
    ): Promise<AgentResponse<MonetizationOutput>> {
        const { prompt, context } = request;
        const start = Date.now();
        this.log(`Implementing SaaS monetization (Stripe)...`, { executionId: context.executionId });

        const system = `You are a Fintech Architect specialized in SaaS monetization and Stripe integration.
Your goal is to implement a robust subscription system.

FEATURES:
- Free tier (limited builds/usage).
- Premium tier (fast builds, advanced features).

OUTPUT:
Respond ONLY with a JSON object:
{
  "stripeConfig": "Stripe API and webhook setup",
  "plans": [
    { "name": "Free", "features": ["Limited builds"], "price": "$0" },
    { "name": "Premium", "features": ["Fast builds", "Advanced features"], "price": "$29/mo" }
  ],
  "usageTracking": "Database schema or logic for tracking build usage",
  "files": [
    { "path": "apps/api/src/lib/stripe.ts", "content": "..." },
    { "path": "apps/api/src/middleware/subscription.ts", "content": "..." },
    { "path": "apps/api/src/api/webhooks/stripe.ts", "content": "..." },
    { "path": "apps/web/hooks/useSubscription.ts", "content": "..." }
  ],
  "summary": "Brief explanation of billing integration and access control"
}`;

        try {
            request.taskType = 'code-gen';
            const { result, tokens } = await this.promptLLM(system, `Project: ${prompt}`, request, signal, strategy);
            const output = result as MonetizationOutput;

            return {
                success: true,
                data: output,
                artifacts: output.files?.map((f: { path: string, content: string }) => ({ path: f.path, content: f.content, type: 'code' })) || [],
                metrics: { durationMs: Date.now() - start, tokensTotal: tokens }
            };
        } catch (error) {
            return {
                success: false,
                data: { stripeConfig: '', plans: [], usageTracking: '', files: [] },
                artifacts: [],
                metrics: { durationMs: 0, tokensTotal: 0 },
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
}
