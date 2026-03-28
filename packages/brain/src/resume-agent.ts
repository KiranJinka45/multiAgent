import { BaseAgent, AgentResponse } from './base-agent';
import { AgentContext } from '@packages/contracts';

export interface ResumeInput {
    resumeText: string;
    targetRole?: string;
}

export class ResumeAgent extends BaseAgent {
    getName() { return 'ResumeAgent'; }

    protected async run(
        input: ResumeInput,
        _context: AgentContext,
        signal?: AbortSignal,
        _strategy?: any
    ): Promise<AgentResponse> {
        this.log(`Optimizing resume for role: ${input.targetRole || 'General'}`);

        // 1. Fetch Active/Candidate Strategy for A/B Testing
        const { db } = await import('@packages/db');
        const strategies = await db.strategy.findMany({ where: { agent: 'ResumeAgent' } });
        
        // Simple A/B split: 50% chance to try a candidate if exists, otherwise active
        const candidate = strategies.find(s => !s.isActive);
        const active = strategies.find(s => s.isActive);
        const selectedStrategy = (candidate && Math.random() > 0.5) ? candidate : active;
        
        const config = selectedStrategy?.config as any || { temperature: 0.7 };

        const system = `You are a Senior Technical Recruiter and Resume Expert.
        Your goal is to transform a "task-based" resume into a "result-based" resume.
        
        RULES:
        1. Replace passive verbs (e.g., "worked on") with strong action verbs (e.g., "orchestrated").
        2. Inject measurable metrics where possible (%, $, hours).
        3. Optimize for ATS keywords relevant to the target role.
        ${config.systemPromptSuffix || ''}
        4. Output strictly valid JSON.

        Output Format:
        {
            "score": number,
            "suggestions": ["string"],
            "improved_text": "Markdown formatted resume"
        }`;

        try {
            const { result, tokens } = await this.promptLLM(system, input.resumeText, config.model || 'llama-3.3-70b-versatile', signal, selectedStrategy, _context);

            this.log(`Resume optimized via strategy v${selectedStrategy?.version || 1}. Score: ${result.score}.`);

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
