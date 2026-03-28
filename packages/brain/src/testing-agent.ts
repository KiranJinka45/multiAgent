import { BaseAgent, AgentResponse } from './base-agent';
import { AgentContext } from '@packages/contracts';

export class TestingAgent extends BaseAgent {
    getName() { return 'TestingAgent'; }

    protected async run(input: { prompt: string, allFiles: unknown[] }, _context: AgentContext, signal?: AbortSignal, strategy?: any): Promise<AgentResponse> {
        void _context;
        this.log(`Generating Test cases and QA scripts...`);
        try {
            const system = `You are a QA Engineer. 
            Generate unit and integration tests.
            Output JSON with "files" (array of {path: string, content: string}) for testing.`;

            const userPrompt = `Project: ${input.prompt}\nFiles Context: ${JSON.stringify(input.allFiles)}`;
            const { result, tokens } = await this.promptLLM(system, userPrompt, 'llama-3.1-8b-instant', signal, strategy, _context);

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
