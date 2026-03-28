import { BaseAgent, AgentResponse } from './base-agent';
import { AgentContext } from '@packages/contracts';
import { StrategyConfig } from '@packages/utils';

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

    protected async run(
        input: {
            task: string;
            output: unknown;
            requirements?: string;
            fileContext?: { path: string, content: string }[];
        },
        _context: AgentContext,
        signal?: AbortSignal,
        strategy?: StrategyConfig
    ): Promise<AgentResponse<CriticOutput>> {
        this.log(`Critical evaluation of task: ${input.task}...`);

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

        const userPrompt = `TASK: ${input.task}
REQUIREMENTS: ${input.requirements || 'N/A'}

OUTPUT TO EVALUATE:
${JSON.stringify(input.output, null, 2)}

FILE CONTEXT (if any):
${input.fileContext?.map(f => `--- ${f.path} ---\n${f.content.substring(0, 1000)}`).join('\n')}`;

        try {
            const { result, tokens } = await this.promptLLM(system, userPrompt, 'llama-3.3-70b-versatile', signal, strategy, _context);
            const output = result as CriticOutput;

            this.log(`Evaluation: ${output.evaluation.toUpperCase()} (Score: ${output.score}). Feedback: ${output.feedback}`);

            return {
                success: true,
                data: output,
                tokens,
                confidence: output.score
            };
        } catch (error) {
            return {
                success: false,
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
