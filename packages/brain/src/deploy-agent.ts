import { BaseAgent, AgentResponse } from './index';
import { AgentContext } from '@libs/contracts';

export class DeploymentAgent extends BaseAgent {
    getName() { return 'DeploymentAgent'; }

    protected async run(input: { prompt: string, allFiles: unknown[] }, _context: AgentContext, signal?: AbortSignal, strategy?: any): Promise<AgentResponse> {
        void _context;
        this.log(`Generating Deployment configuration (Docker, hosting)...`);
        try {
            const system = `You are a DevOps Architect. 
            Create Dockerfiles and deployment scripts.
            Output JSON with:
            1. "files" (array of {path: string, content: string}) for DevOps configuration.
            2. "previewUrl": a string representing the simulated local deployment URL (e.g. "http://localhost:3000").
            Ensure your output is strictly valid JSON matching this schema.`;

            const { result, tokens } = await this.promptLLM(system, `Prompt: ${input.prompt}\nFiles: ${JSON.stringify(input.allFiles)}`, 'llama-3.3-70b-versatile', signal, strategy, _context);

            this.log(`Generated ${result.files?.length || 0} deployment config files`);
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
