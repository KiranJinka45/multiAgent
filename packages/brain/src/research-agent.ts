import { BaseAgent, AgentResponse } from './index';
import { AgentContext } from '@libs/contracts';

export interface ResearchFindings {
    vulnerabilities: string[];
    recommendedLibraries: string[];
    potentialBlockers: string[];
    infrastructureSuggestions: string[];
    competitorAnalysis: string; // Brief architectural comparison
}

export class ResearchAgent extends BaseAgent {
    getName() { return 'ResearchAgent'; }

    protected async run(
        input: { prompt: string },
        _context: AgentContext,
        signal?: AbortSignal,
        strategy?: StrategyConfig
    ): Promise<AgentResponse<ResearchFindings>> {
        this.log('Initiating autonomous research protocol...');

        const system = `You are a Lead Research Engineer at an AI Software Factory.
Your goal is to perform a pre-build analysis of the user's request.
Analyze the prompt for:
1. Necessary high-performance libraries (prefer local/well-supported ones).
2. Potential architectural blockers (e.g., rate limits, environment constraints).
3. Security considerations.
4. Infrastructure needs.

Output strictly valid JSON matching this schema:
{
  "vulnerabilities": ["string"],
  "recommendedLibraries": ["string"],
  "potentialBlockers": ["string"],
  "infrastructureSuggestions": ["string"],
  "competitorAnalysis": "brief summary of how this should be built compared to standard apps"
}`;

        try {
            const { result, tokens } = await this.promptLLM(system, input.prompt, 'llama-3.3-70b-versatile', signal, undefined, _context);
            
            const findings = result as ResearchFindings;
            this.log(`Research complete. Found ${findings.recommendedLibraries.length} key libraries.`);

            return {
                success: true,
                data: findings,
                tokens
            };
        } catch (error) {
            return {
                success: false,
                data: null as unknown as ResearchFindings,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
}
