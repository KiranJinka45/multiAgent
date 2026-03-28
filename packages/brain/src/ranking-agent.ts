import { BaseAgent, AgentResponse } from './base-agent';
import { AgentContext } from '@packages/contracts';
import { StrategyConfig } from '@packages/utils';

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

    protected async run(
        input: RankingInput, 
        _context: AgentContext,
        signal?: AbortSignal,
        strategy?: StrategyConfig
    ): Promise<AgentResponse<RankingOutput>> {
        this.log(`Judging ${input.variants.length} implementation variants based on ${input.criteria}...`);

        const system = `You are a Principal Software Architect Reviewer.
Your job is to compare multiple code implementations and select the ONE that is most robust, maintainable, and efficient.

Criteria: ${input.criteria}

Output strictly valid JSON:
{
  "winnerBranchId": "id",
  "confidence": 0.95,
  "justification": "Why this version is superior"
}`;

        const userPrompt = `Compare these variants:\n\n${input.variants.map(v => `BRANCH: ${v.branchId}\nCODE:\n${v.content}`).join('\n\n---')}`;

        const { result, tokens } = await this.promptLLM(system, userPrompt, 'llama-3.1-8b-instant', signal, strategy, _context);

        return {
            success: true,
            data: result as RankingOutput,
            tokens,
            logs: this.logs
        };
    }
}
