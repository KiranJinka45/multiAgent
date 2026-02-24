import { BaseAgent, AgentResponse } from './base-agent';
import { ExecutionContext } from '../lib/execution-context';

export class TestingAgent extends BaseAgent {
    getName() { return 'TestingAgent'; }

    async execute(input: { prompt: string, allFiles: any[] }, context?: ExecutionContext): Promise<AgentResponse> {
        this.log(`Generating Test cases and QA scripts...`);
        try {
            const system = `You are a QA Engineer. 
            Generate unit and integration tests.
            Output JSON with "files" (array of {path: string, content: string}) for testing.`;

            const { result, tokens } = await this.promptLLM(system, `Project: ${input.prompt}\nFiles Context: ${JSON.stringify(input.allFiles)}`);

            this.log(`Generated ${result.files?.length || 0} testing files.`);
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
