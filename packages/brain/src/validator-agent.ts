import { BaseAgent, AgentResponse } from './base-agent';
import logger from '@packages/utils';
import { AgentContext } from '@packages/contracts';
import { StrategyConfig } from '@packages/utils';

export class ValidatorAgent extends BaseAgent {
    getName() { return 'ValidatorAgent'; }

    protected async run(input: { agentName: string, output: unknown, spec: string }, _context: AgentContext, signal?: AbortSignal, strategy?: StrategyConfig): Promise<AgentResponse> {
        const executionId = _context.getExecutionId?.() || 'unknown';
        this.log(`Validating output for ${input.agentName}...`, { executionId });

        try {
            const system = `You are a Senior QA Automation Engineer.
            Validate the following agent output against the given specification.
            Provide a confidence score between 0 and 1.
            If score < 0.8, suggest specific improvements.
            Output JSON with "confidenceScore" (number), "isValid" (boolean), and "feedback" (string).`;

            const prompt = `Agent: ${input.agentName}\nSpec: ${input.spec}\nOutput: ${JSON.stringify(input.output)}`;

            const { result, tokens } = await this.promptLLM(system, prompt, 'llama-3.3-70b-versatile', signal, strategy, _context);

            logger.info({
                agentValidated: input.agentName,
                confidence: result.confidenceScore,
                tokens,
                executionId
            }, 'Validation complete');

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
