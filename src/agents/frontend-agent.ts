import { BaseAgent, AgentResponse } from './base-agent';
import { ExecutionContext } from '../lib/execution-context';

export class FrontendAgent extends BaseAgent {
    getName() { return 'FrontendAgent'; }

    async execute(input: { prompt: string, backendFiles: any[] }, context?: ExecutionContext): Promise<AgentResponse> {
        this.log(`Generating Frontend UI based on backend integration...`);
        try {
            const system = `You are a Senior Frontend Architect. 
            Design a premium, responsive UI using Tailwind.
            Output JSON with "files" (array of {path: string, content: string}) for the frontend.`;

            const { result, tokens } = await this.promptLLM(system, `Project: ${input.prompt}\nBackend Context: ${JSON.stringify(input.backendFiles)}`);

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
