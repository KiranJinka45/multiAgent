import { BaseAgent } from './base-agent';
import { AgentRequest, AgentResponse, AgentContext } from '@libs/contracts';

export interface RankingInput {
    variants: Array<{
        branchId: string;
        content: string;
        metrics?: Record<string, number>;
    }>;
    criteria: 'reliability' | 'performance' | 'readability';
}

export interface RankingOutput {
    winnerBranchId: string;
    confidence: number;
    justification: string;
}

/**
 * RankingAgent - The "Judge" in a speculative swarm.
 * 
 * Evaluates multiple parallel implementations and selects the best one 
 * based on provided criteria and heuristic analysis.
 */
export class RankingAgent extends BaseAgent {
    getName() { return 'RankingAgent'; }

    async execute(request: AgentRequest<RankingInput>): Promise<AgentResponse<RankingOutput>> {
        const { prompt: userPromptContext, context, params } = request;
        const start = Date.now();
        this.log(`Judging ${params.variants.length} implementation variants based on ${params.criteria}...`, { executionId: context.executionId });

        const system = `You are a Principal Software Architect Reviewer.
Your job is to compare multiple code implementations and select the ONE that is most robust, maintainable, and efficient.

Criteria: ${params.criteria}

Output strictly valid JSON:
{
  "winnerBranchId": "id",
  "confidence": 0.95,
  "justification": "Why this version is superior"
}`;

        const comparisonPrompt = `Compare these variants:\n\n${params.variants.map(v => `BRANCH: ${v.branchId}\nCODE:\n${v.content}`).join('\n\n---')}`;

        try {
            request.taskType = 'planning';
            const { result, tokens } = await this.promptLLM(system, comparisonPrompt, request);

            return {
                success: true,
                data: result as RankingOutput,
                artifacts: [],
                metrics: { durationMs: Date.now() - start, tokensTotal: tokens }
            };
        } catch (error) {
            return {
                success: false,
                data: null as any,
                artifacts: [],
                metrics: { durationMs: 0, tokensTotal: 0 },
                error: String(error)
            };
        }
    }
}
