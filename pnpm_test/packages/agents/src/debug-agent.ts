import { BaseAgent } from '@agents/base-agent';
import { AgentRequest, AgentResponse, AgentContext } from '@shared-types/agent-contracts';
import { StrategyConfig } from '@services/agent-intelligence/strategy-engine';

export interface DebugPatch {
    path: string;
    content: string;
}

export interface DebugOutput {
    rootCause: string;
    fix: string;
    preventiveAction: string;
    explanation: string;
    patches: DebugPatch[];
    confidence: number;
    category: 'syntax' | 'type_error' | 'import' | 'logic' | 'dependency' | 'runtime' | 'unknown';
}

/**
 * DebugAgent — Enhanced self-healing agent with root-cause analysis.
 *
 * Unlike the simpler RepairAgent, the DebugAgent:
 *   1. Performs structured root-cause analysis before generating patches.
 *   2. Accepts a failure history to avoid repeating the same failed strategies.
 *   3. Returns a confidence score so the orchestrator can decide whether to accept the fix.
 *   4. Categorises the failure type for downstream analytics.
 */
export class DebugAgent extends BaseAgent {
    getName() { return 'DebugAgent'; }

    async execute(
        request: AgentRequest<{
            errors: string;
            stdout?: string;
            files: { path: string; content: string }[];
            failureHistory?: string[];
            userPrompt?: string;
        }>,
        signal?: AbortSignal,
        strategy?: StrategyConfig
    ): Promise<AgentResponse<DebugOutput>> {
        const { params, context } = request;
        const start = Date.now();
        this.log(`Performing autonomous root-cause analysis on ${params.errors.substring(0, 80)}...`, { executionId: context.executionId });

        try {
            const historyBlock = params.failureHistory?.length
                ? `\n\nPREVIOUS FIX ATTEMPTS THAT FAILED:\n${params.failureHistory.map((f, i) => `${i + 1}. ${f}`).join('\n')}`
                : '';

            const system = `You are a Senior Autonomous AI Debugger.
Your goal is to automatically detect, analyze, and permanently fix system failures.

TASK:
- Identify the root cause from provided logs and errors.
- Generate a surgical fix and a corresponding preventive action.
- Ensure that the fix is permanent and that the issue never repeats (no temporary workarounds).

OUTPUT:
Respond ONLY with a JSON object:
{
  "rootCause": "Deep dive into why the failure occurred",
  "fix": "Specific description of the code fix applied",
  "preventiveAction": "What was done to ensure this never happens again (e.g., adding a guard, improving types, updating config)",
  "explanation": "Detailed step-by-step diagnostic",
  "patches": [
    { "path": "the/file/path.ts", "content": "..." }
  ],
  "confidence": 0.0-1.0,
  "category": "syntax | type_error | import | logic | dependency | runtime | unknown"
}`;

            const userPrompt = `ERROR OUTPUT: ${params.errors.substring(0, 4000)}\n${historyBlock}`;

            request.taskType = 'debug';
            const { result, tokens } = await this.promptLLM(system, userPrompt, request, signal, strategy);
            const output = result as DebugOutput;

            return {
                success: true,
                data: output,
                artifacts: output.patches.map(p => ({ path: p.path, content: p.content, type: 'code' })),
                metrics: { durationMs: Date.now() - start, tokensTotal: tokens }
            };
        } catch (error) {
            return {
                success: false,
                data: { 
                    rootCause: 'fail', 
                    fix: 'none',
                    preventiveAction: 'none',
                    explanation: String(error), 
                    patches: [], 
                    confidence: 0, 
                    category: 'unknown' 
                },
                artifacts: [],
                metrics: { durationMs: 0, tokensTotal: 0 },
                error: String(error)
            };
        }
    }
}
