import { BaseAgent, AgentResponse } from './index';
import { AgentContext } from '@libs/contracts';

export class FrontendAgent extends BaseAgent {
    getName() { return 'FrontendAgent'; }

    protected async run(
        input: { 
            prompt: string, 
            backendFiles: unknown[], 
            isIncremental?: boolean, 
            affectedFiles?: string[],
            isPatch?: boolean,
            section?: string 
        }, 
        _context: AgentContext, 
        signal?: AbortSignal, 
        strategy?: any
    ): Promise<AgentResponse> {
        if (input.isIncremental && !input.isPatch) {
            const frontendFiles = input.affectedFiles?.filter(f => f.includes('page') || f.includes('layout') || f.includes('component') || f.includes('tailwind') || f.endsWith('.css'));
            if (!frontendFiles || frontendFiles.length === 0) {
                this.log(`Skipping Frontend generation (no frontend files affected)`);
                return { success: true, data: { files: [] }, tokens: 0 };
            }
        }
        
        void _context;
        
        if (input.isPatch && input.section) {
            this.log(`Generating SURGICAL PATCH for section: ${input.section}`);
            const system = `You are a Senior UI/UX Engineer.
Your goal is to generate the JSX/TSX content for a specific SECTION of a page.
The parent component already exists; you only provide the inner code for the requested section.

SECTION TO GENERATE: ${input.section}
RULES:
1. STYLING: Use Tailwind CSS classes exclusively.
2. COMPONENTS: Use Lucide-React icons if needed.
3. CONTEXT: Follow the user's prompt aesthetic but stay within the limits of a single section.
4. FORMAT: Return valid JSX that can be injected into the template.

Output strictly valid JSON:
{
  "section": "${input.section}",
  "content": "JSX code string here..."
}`;
            const { result, tokens } = await this.promptLLM(system, `User Request: ${input.prompt}`, 'llama-3.3-70b-versatile', signal, strategy, _context);
            return {
                success: true,
                data: { patch: result },
                tokens
            };
        }

        this.log(`Generating FULL Frontend UI modules...`);
        try {
            const system = `You are a Senior Frontend Architect. 
            Design a premium, responsive UI using Tailwind.
            Output JSON with "files" (array of {path: string, content: string}) for the frontend.`;

            const { result, tokens } = await this.promptLLM(system, `Project: ${input.prompt}\nBackend Context: ${JSON.stringify(input.backendFiles)}`, 'llama-3.3-70b-versatile', signal, strategy);

            this.log(`Generated ${result.files?.length || 0} frontend files`);
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
