import { BaseAgent, AgentResponse } from './base-agent';
import { AgentContext } from '../types/agent-context';

export class FrontendAgent extends BaseAgent {
    getName() { return 'FrontendAgent'; }

    async execute(input: { prompt: string, backendFiles: unknown[] }, _context: AgentContext, signal?: AbortSignal): Promise<AgentResponse> {
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
