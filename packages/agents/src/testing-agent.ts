import { BaseAgent } from './base-agent';
import { AgentRequest, AgentResponse, AgentContext } from '@packages/contracts';
import { StrategyConfig } from '@packages/utils';

export class TestingAgent extends BaseAgent {
    getName() { return 'TestingAgent'; }

    async execute(
        request: AgentRequest<{ allFiles: any[] }>, 
        signal?: AbortSignal, 
        strategy?: StrategyConfig
    ): Promise<AgentResponse> {
        const { prompt, context, params } = request;
        const start = Date.now();

        this.log(`Generating Test cases and QA scripts...`, { executionId: context.executionId });
        try {
            const system = `You are a QA Engineer. 
            Generate unit and integration tests.
            Output JSON with "files" (array of {path: string, content: string}) for testing.`;

            request.taskType = 'testing';
            const { result, tokens } = await this.promptLLM(system, `Project: ${prompt}\nFiles Context: ${JSON.stringify(params.allFiles)}`, request, signal, strategy);

            this.log(`Generated ${result.files?.length || 0} testing files.`, { executionId: context.executionId });
            return {
                success: true,
                data: result,
                artifacts: result.files?.map((f: any) => ({ path: f.path, content: f.content, type: 'documentation' })) || [],
                metrics: { durationMs: Date.now() - start, tokensTotal: tokens }
            };
        } catch (error) {
            return {
                success: false,
                data: null,
                artifacts: [],
                metrics: { durationMs: 0, tokensTotal: 0 },
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
}
