import { BaseAgent, AgentResponse } from '@agents/base-agent';
import logger from '@config/logger';
import { AgentContext } from '@shared-types/agent-context';

export class ValidatorAgent extends BaseAgent {
    getName() { return 'ValidatorAgent'; }

    async execute(input: { agentName: string, output: unknown, spec: string }, _context: AgentContext, signal?: AbortSignal, strategy?: any): Promise<AgentResponse> {
        const executionId = _context.getExecutionId?.() || 'unknown';
        this.log(`Validating output for ${input.agentName}...`, { executionId });

        try {
            const system = `You are a Senior QA Automation Engineer.
            Validate the following agent output against the given specification.
            Provide a confidence score between 0 and 1.
            If score < 0.8, suggest specific improvements.
            Output JSON with "confidenceScore" (number), "isValid" (boolean), and "feedback" (string).`;

            const userPrompt = `Agent: ${input.agentName}\nSpec: ${input.spec}\nOutput: ${JSON.stringify(input.output)}`;

            const { result, tokens } = await this.promptLLM(system, userPrompt, 'llama-3.1-8b-instant', signal, strategy);

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
