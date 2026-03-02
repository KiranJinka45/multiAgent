import { BaseAgent, AgentResponse } from './base-agent';
import { AgentContext } from '../types/agent-context';

export class BackendAgent extends BaseAgent {
    getName() { return 'BackendAgent'; }

    async execute(input: { prompt: string, schema: string }, _context: AgentContext, signal?: AbortSignal): Promise<AgentResponse> {
        void _context;
        this.log(`Generating Backend APIs based on schema...`);
        try {
            const system = `You are a Senior Backend Engineer. 
            Design internal API routes and server logic.
            Output JSON with "files" (array of {path: string, content: string}) representing the backend structure.`;

            const { result, tokens } = await this.promptLLM(system, `Prompt: ${input.prompt}\nSchema: ${JSON.stringify(input.schema)}`, 'llama-3.3-70b-versatile', signal);

            this.log(`Generated ${result.files?.length || 0} backend files`);
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
