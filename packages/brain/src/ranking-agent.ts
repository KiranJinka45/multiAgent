import { BaseAgent, AgentResponse } from './base-agent';
import { AgentContext } from '@packages/contracts';

export class RankingAgent extends BaseAgent {
    getName() { return 'RankingAgent'; }

    protected async run(input: { variations: { id: string, files: any[] }[], originalPrompt: string }, _context: AgentContext, signal?: AbortSignal, strategy?: any): Promise<AgentResponse> {
        this.log(`Ranking ${input.variations.length} speculative variations...`);
        try {
            const system = `You are a Senior Software Architect and Reviewer.
Your task is to evaluate multiple competing code implementations for the same task.
You must select the VARIATION that is most complete, maintainable, and follows modern best practices.

EVALUATION CRITERIA:
1. Completeness: Does it fully address the prompt?
2. Architecture: Is the project structure logical and scalable?
3. Quality: Is the code clean, typed, and well-documented?
4. Safety: No security vulnerabilities or obvious bugs?

Output strictly JSON:
{
  "selectedVariationId": "id of the best variation",
  "explanation": "Why this variation was selected",
  "confidenceScore": 0.0-1.0
}`;

            const prompt = `
ORIGINAL PROMPT: ${input.originalPrompt}

--- VARIATIONS TO EVALUATE ---
${input.variations.map(v => `
[VARIATION ID: ${v.id}]
Files: ${v.files.map(f => f.path).join(', ')}
`).join('\n')}
`;

            const { result, tokens } = await this.promptLLM(system, prompt, 'llama-3.3-70b-versatile', signal, strategy, _context);

            this.log(`Selected variation: ${result.selectedVariationId}. Explanation: ${result.explanation}`);

            return {
                success: true,
                data: result,
                tokens
            };
        } catch (error) {
            return {
                success: false,
                data: null,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
}
