import { BaseAgent, AgentResponse } from './base-agent';
import { AgentContext } from '@packages/contracts';
import { db } from '@packages/db';

export interface SeoInput {
    niche: string;
    keywords: string[];
}

export class ProgrammaticSeoAgent extends BaseAgent {
    getName() { return 'ProgrammaticSeoAgent'; }

    protected async run(
        input: SeoInput,
        _context: AgentContext,
        signal?: AbortSignal,
        strategy?: any
    ): Promise<AgentResponse> {
        this.log(`Generating SEO content for niche: ${input.niche}`);

        const system = `You are an SEO & Conversion Expert.
        Create an ultra-high-intent landing page for the keyword: "${input.niche}".
        
        Target Keywords: ${input.keywords.join(', ')}
        
        GOAL:
        - Educational content about "${input.niche}".
        - CLEAR CTA to the "AI Resume Optimizer" tool at /resume.
        - Structure: H1 (Keyword-rich), H2 (Problem), H3 (Solution/Tool), P (Value prop).
        
        Output JSON:
        {
            "pages": [
                {
                    "slug": "${input.niche.toLowerCase().replace(/ /g, '-')}",
                    "title": "Optimized Resume for ${input.niche} | AI Power",
                    "content": "Markdown content...",
                    "metaDescription": "Stop getting rejected. Use AI to optimize your ${input.niche} resume in 30 seconds."
                }
            ]
        }`;

        try {
            const { result, tokens } = await this.promptLLM(system, `Generate a landing page for ${input.niche}`, 'llama-3.3-70b-versatile', signal, strategy, _context);

            this.log(`Surgical SEO page generated for ${input.niche}.`);

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
