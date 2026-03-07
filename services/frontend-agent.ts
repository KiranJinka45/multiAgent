import { BaseAgent, AgentResponse } from '@services/base-agent';
import { AgentContext } from '@shared-types/agent-context';

export class FrontendAgent extends BaseAgent {
    getName() { return 'FrontendAgent'; }

    async execute(input: { prompt: string, backendFiles: unknown[], isIncremental?: boolean, affectedFiles?: string[] }, _context: AgentContext, signal?: AbortSignal): Promise<AgentResponse> {
        if (input.isIncremental) {
            const frontendFiles = input.affectedFiles?.filter(f => f.includes('page') || f.includes('layout') || f.includes('component') || f.includes('tailwind') || f.endsWith('.css'));
            if (!frontendFiles || frontendFiles.length === 0) {
                this.log(`Skipping Frontend generation (no frontend files affected in incremental build)`);
                return { success: true, data: { files: [] }, tokens: 0, logs: this.logs };
            }
        }
        void _context;
        this.log(`Generating Frontend UI based on backend integration...`);
        try {
            const system = `You are a Senior Frontend Architect. 
            Design a premium, responsive UI using Tailwind.
            Output JSON with "files" (array of {path: string, content: string}) for the frontend.`;

            const { result, tokens } = await this.promptLLM(system, `Project: ${input.prompt}\nBackend Context: ${JSON.stringify(input.backendFiles)}`, 'llama-3.3-70b-versatile', signal);

            this.log(`Generated ${result.files?.length || 0} frontend files`);
            return {
                success: true,
                data: result,
                tokens,
                logs: this.logs
            };
        } catch (error) {
            return {
                success: false,
                data: null,
                logs: this.logs,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
}
