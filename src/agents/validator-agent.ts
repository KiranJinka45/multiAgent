import { BaseAgent, AgentResponse } from './base-agent';
import logger from '../lib/logger';

export class ValidatorAgent extends BaseAgent {
    getName() { return 'ValidatorAgent'; }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
    async execute(input: { agentName: string, output: any, spec: string }, _context?: any): Promise<AgentResponse> {
        this.log(`Validating output for ${input.agentName}...`);

        try {
            const system = `You are a Senior QA Automation Engineer.
            Validate the following agent output against the given specification.
            Provide a confidence score between 0 and 1.
            If score < 0.8, suggest specific improvements.
            Output JSON with "confidenceScore" (number), "isValid" (boolean), and "feedback" (string).`;

            const userPrompt = `Agent: ${input.agentName}\nSpec: ${input.spec}\nOutput: ${JSON.stringify(input.output)}`;

            const { result, tokens } = await this.promptLLM(system, userPrompt, 'llama-3.1-8b-instant');

            logger.info({
                agentValidated: input.agentName,
                confidence: result.confidenceScore,
                tokens
            }, 'Validation complete');

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
