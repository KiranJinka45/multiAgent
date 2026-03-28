import { BaseAgent } from './base-agent';
import { AgentRequest, AgentResponse, JobArtifact } from '@packages/contracts';
import logger from '@packages/utils';

/**
 * JudgeAgent (AI Judge) - Phase 19 Hardening
 * Responsible for verifying that the generated artifacts actually fulfill the user's intent.
 */
export class JudgeAgent extends BaseAgent {
    constructor() {
        super();
    }

    getName(): string {
        return 'judge';
    }

    async execute(request: AgentRequest<{ artifacts: JobArtifact[] }>): Promise<AgentResponse> {
        const { prompt, params, tenantId } = request;
        const artifactsSummary = params.artifacts.map(a => `- ${a.path}`).join('\n');

        logger.info({ tenantId }, '[JudgeAgent] Evaluating intent vs output');

        const systemPrompt = `
You are a Principal AI Judge. Your task is to evaluate whether the provided artifacts satisfy the User's Intent.

User Intent: "${prompt}"

Generated Artifacts:
${artifactsSummary}

Respond in JSON format:
{
  "success": boolean,
  "confidence": number (0-1),
  "reasoning": "Detailed explanation of why the output matches or fails the intent",
  "criticism": ["Point 1", "Point 2"]
}
        `.trim();

        try {
            const llmRes = await this.promptLLM(systemPrompt, 'Evaluate the artifacts against intent.', request);
            const evaluation = llmRes.result;

            return {
                success: true,
                data: evaluation,
                artifacts: [],
                metrics: {
                    durationMs: 0,
                    tokensTotal: llmRes.tokens
                },
                confidence: evaluation.confidence
            };
        } catch (err: unknown) {
            logger.error({ err }, '[JudgeAgent] Failed to perform intent evaluation');
            return {
                success: false,
                data: null,
                artifacts: [],
                metrics: { durationMs: 0, tokensTotal: 0 },
                error: 'Intent evaluation failed'
            };
        }
    }
}
