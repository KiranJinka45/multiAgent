import { BaseAgent } from './base-agent';
import { AgentRequest, AgentResponse, AgentContext } from '@libs/contracts';
import { StrategyConfig } from '@libs/utils';

export class ValidatorAgent extends BaseAgent {
    getName() { return 'ValidatorAgent'; }

    async execute(
        request: AgentRequest<{ agentName: string, output: unknown, spec: string }>, 
        signal?: AbortSignal, 
        strategy?: StrategyConfig
    ): Promise<AgentResponse> {
        const { params, context } = request;
        const start = Date.now();
        this.log(`Validating output for ${params.agentName}...`, { executionId: context.executionId });

        try {
            const system = `You are a Senior QA Automation Engineer.
            Validate agent output against spec. Output JSON: { "confidenceScore": 0.9, "isValid": true, "feedback": "..." }`;

            request.taskType = 'validation';
            const { result, tokens } = await this.promptLLM(system, `Agent: ${params.agentName}\nSpec: ${params.spec}\nOutput: ${JSON.stringify(params.output)}`, request, signal, strategy);

            return {
                success: true,
                data: result,
                artifacts: [],
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
