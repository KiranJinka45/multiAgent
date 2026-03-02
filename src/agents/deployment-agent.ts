import { BaseAgent, AgentResponse } from './base-agent';

export class DeploymentAgent extends BaseAgent {
    getName() { return 'DeploymentAgent'; }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
    async execute(input: { prompt: string, allFiles: any[] }, _context?: any): Promise<AgentResponse> {
        this.log(`Generating Deployment configuration (Docker, hosting)...`);
        try {
            const system = `You are a DevOps Architect. 
            Create Dockerfiles and deployment scripts.
            Output JSON with:
            1. "files" (array of {path: string, content: string}) for DevOps configuration.
            2. "previewUrl": a string representing the simulated local deployment URL (e.g. "http://localhost:3000").
            Ensure your output is strictly valid JSON matching this schema.`;

            const { result, tokens } = await this.promptLLM(system, `Prompt: ${input.prompt}\nFiles: ${JSON.stringify(input.allFiles)}`);

            this.log(`Generated ${result.files?.length || 0} deployment config files`);
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
