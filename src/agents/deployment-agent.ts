import { BaseAgent, AgentResponse } from './base-agent';
import { ExecutionContext } from '../lib/execution-context';

export class DeploymentAgent extends BaseAgent {
    getName() { return 'DeploymentAgent'; }

    async execute(input: { prompt: string, allFiles: any[] }, context?: ExecutionContext): Promise<AgentResponse> {
        this.log(`Generating Deployment configuration (Docker, hosting)...`);
        try {
            const system = `You are a DevOps Architect. 
            Create Dockerfiles and deployment scripts.
            Output JSON with "files" (array of {path: string, content: string}) for DevOps.`;

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
