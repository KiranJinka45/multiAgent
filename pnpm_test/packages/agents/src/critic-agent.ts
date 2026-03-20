import { BaseAgent } from '@agents/base-agent';
import { AgentRequest, AgentResponse, CriticParams } from '@shared-types/agent-contracts';
import { StrategyConfig } from '@services/agent-intelligence/strategy-engine';

export interface CriticOutput {
    evaluation: 'pass' | 'fail';
    score: number;
    feedback: string;
    suggestions: string[];
}

/**
 * CriticAgent
 * 
 * Specialized reasoning node that evaluates work produced by Executor agents.
 * It ensures:
 * 1. Requirements compliance
 * 2. Code quality and syntax correctness
 * 3. Security best practices
 * 4. Architectural consistency
 */
export class CriticAgent extends BaseAgent {
    getName() { return 'CriticAgent'; }

    async execute(
        request: AgentRequest<CriticParams>, 
        signal?: AbortSignal, 
        strategy?: StrategyConfig
    ): Promise<AgentResponse<CriticOutput>> {
        const { prompt, context, params } = request;
        const start = Date.now();

        this.log(`Critical evaluation of task: ${params.task}...`);

        const system = `You are a Senior Logic & Quality Critic (Aion Validator).
Your role is to evaluate the work produced by other agents and provide objective feedback.

Evaluation Criteria:
1. Completeness: Did the agent fulfill all requirements of the task?
2. Correctness: Is the code or logic syntactically correct and logical?
3. Security: Are there obvious security flaws (leaked keys, dangerous functions)?
4. Consistency: Does it match the project architecture?

Rules:
- Be strict. If you find errors, fail the task and provide specific, actionable feedback.
- If the output is perfect, pass it with a high score.
- Output ONLY valid JSON.

Output Format:
{
  "evaluation": "pass" | "fail",
  "score": 0.0 - 1.0,
  "feedback": "Concise summary of your evaluation",
  "suggestions": ["specific improvement 1", "specific improvement 2"]
}`;

        const userPrompt = `TASK: ${params.task}
PRODUCED OUTPUT: ${JSON.stringify(params.output)}
EXPECTED REQUIREMENTS: ${params.requirements || 'N/A'}

RELEVANT FILE CONTEXT:
${params.artifacts?.map(f => `--- ${f.path} ---\n${f.content.substring(0, 1000)}`).join('\n')}`;

        try {
            request.taskType = 'refactor';
            const { result, tokens } = await this.promptLLM(system, userPrompt, request, signal, strategy);
            const output = result as CriticOutput;

            this.log(`Evaluation: ${output.evaluation.toUpperCase()} (Score: ${output.score}). Feedback: ${output.feedback}`);

            return {
                success: true,
                data: output,
                artifacts: [],
                metrics: {
                    durationMs: Date.now() - start,
                    tokensTotal: tokens
                },
                confidence: output.score
            };
        } catch (error) {
            // tokens might not be available if the LLM call failed before returning tokens
            const tokens = 0; 

            return {
                success: false,
                artifacts: [],
                metrics: {
                    durationMs: Date.now() - start,
                    tokensTotal: tokens
                },
                data: {
                    evaluation: 'fail',
                    score: 0,
                    feedback: 'Critic internal failure during evaluation.',
                    suggestions: []
                },
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
}
