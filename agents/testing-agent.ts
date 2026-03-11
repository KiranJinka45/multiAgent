import { BaseAgent, AgentResponse } from './base-agent';
import { AgentContext } from '../types/agent-context';

export class TestingAgent extends BaseAgent {
    getName() { return 'TestingAgent'; }

    async execute(input: { prompt: string, allFiles: unknown[] }, _context: AgentContext, signal?: AbortSignal, strategy?: any): Promise<AgentResponse> {
        void _context;
        this.log(`Generating Test cases and QA scripts...`);
        try {
            const system = `You are a QA Engineer. 
            Generate unit and integration tests.
            Output JSON with "files" (array of {path: string, content: string}) for testing.`;

            const { result, tokens } = await this.promptLLM(system, `Project: ${input.prompt}\nFiles Context: ${JSON.stringify(input.allFiles)}`, 'llama-3.3-70b-versatile', signal, strategy);

            this.log(`Generated ${result.files?.length || 0} testing files.`);
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
