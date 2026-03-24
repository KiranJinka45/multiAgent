import { BaseAgent, AgentResponse } from './index';
import { AgentContext } from '@libs/contracts';
import { logger } from '@libs/utils';

export interface SocialInput {
    platform: 'twitter' | 'linkedin';
    topic: string;
    productLink: string;
}

export class SocialAgent extends BaseAgent {
    getName() { return 'SocialAgent'; }

    protected async run(
        input: SocialInput,
        _context: AgentContext,
        signal?: AbortSignal,
        strategy?: any
    ): Promise<AgentResponse> {
        this.log(`Generating high-engagement social copy for ${input.platform} on topic: ${input.topic}`);

        const system = `You are a Direct Response Marketing Expert.
        Your goal is to write a highly viral, value-driven post for ${input.platform}.
        The goal is to drive traffic to ${input.productLink}.
        
        Focus on:
        - Hook: A polarizing or curiosity-inducing first line.
        - Value: 3 bullet points of benefit.
        - CTA: Clear, low-friction link click.
        
        Platform-specific rules:
        - Twitter: Short, punchy, use threads if needed.
        - LinkedIn: Longer, story-based, professional but human.`;

        try {
            const { result, tokens } = await this.promptLLM(system, `Topic: ${input.topic}`, 'llama-3.3-70b-versatile', signal, strategy, _context);

            this.log(`Content generated for ${input.platform}. Ready for distribution.`);

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
