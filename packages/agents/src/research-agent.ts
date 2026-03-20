import { BaseAgent } from './base-agent';
import { AgentRequest, AgentResponse, AgentContext } from '@libs/contracts';

export interface ResearchFindings {
    vulnerabilities: string[];
    recommendedLibraries: string[];
    potentialBlockers: string[];
    infrastructureSuggestions: string[];
    competitorAnalysis: string; // Brief architectural comparison
}

export class ResearchAgent extends BaseAgent {
    getName() { return 'ResearchAgent'; }

    async execute(
        request: AgentRequest<{ prompt: string }>,
        signal?: AbortSignal
    ): Promise<AgentResponse<ResearchFindings>> {
        const { prompt, context } = request;
        const start = Date.now();
        this.log('Initiating autonomous research protocol...', { executionId: context.executionId });

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
            request.taskType = 'planning';
            const { result, tokens } = await this.promptLLM(system, prompt, request, signal);
            
            const findings = result as ResearchFindings;
            this.log(`Research complete. Found ${findings.recommendedLibraries.length} key libraries.`, { executionId: context.executionId });

            return {
                success: true,
                data: findings,
                artifacts: [],
                metrics: { durationMs: Date.now() - start, tokensTotal: tokens }
            };
        } catch (error) {
            return {
                success: false,
                data: null as unknown as ResearchFindings,
                artifacts: [],
                metrics: { durationMs: 0, tokensTotal: 0 },
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
}
