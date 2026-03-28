import { BaseAgent, AgentResponse } from '@agents/base-agent';
import { AgentContext } from '@shared-types/agent-context';
import { StrategyConfig } from '@services/agent-intelligence/strategy-engine';

export interface DebugPatch {
    path: string;
    content: string;
}

export interface DebugOutput {
    rootCause: string;
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
        input: {
            errors: string;
            stdout?: string;
            files: { path: string; content: string }[];
            failureHistory?: string[];
            userPrompt?: string;
        },
        _context: AgentContext,
        signal?: AbortSignal,
        strategy?: StrategyConfig
    ): Promise<AgentResponse<DebugOutput>> {
        void _context;
        this.log(`Performing autonomous root-cause analysis on ${input.errors.substring(0, 80)}...`);

        try {
            const historyBlock = input.failureHistory?.length
                ? `\n\nPREVIOUS FIX ATTEMPTS THAT FAILED (do NOT repeat these approaches):\n${input.failureHistory.map((f, i) => `${i + 1}. ${f}`).join('\n')}`
                : '';

            const system = `You are an elite autonomous AI Debugger (Devin-class).
A generated application hit fatal errors during compilation or runtime.

Your process:
1. DIAGNOSE: Identify the exact root cause from the error logs.
2. CATEGORISE: Classify the error type (syntax, type_error, import, logic, dependency, runtime, unknown).
3. FIX: Output minimal, surgical patches that address the root cause.
4. SCORE: Rate your confidence in the fix from 0 to 1.

Rules:
- Only patch files that are directly responsible for the error.
- Each patch must contain the COMPLETE file content (not just the changed lines).
- Ensure all imports resolve correctly.
- Never introduce new dependencies that aren't already in package.json.
- If you see the same error pattern in the failure history, try a fundamentally different approach.
- Be conservative: fix the error without changing unrelated code.

Output strictly valid JSON:
{
  "rootCause": "One-sentence technical diagnosis of why it failed",
  "explanation": "Detailed step-by-step explanation of your fix",
  "category": "syntax|type_error|import|logic|dependency|runtime|unknown",
  "confidence": 0.85,
  "patches": [
    { "path": "relative/path/to/file.ts", "content": "complete corrected file content" }
  ]
}`;

            const userPrompt = `ERROR OUTPUT:
${input.errors.substring(0, 4000)}

${input.stdout ? `STDOUT:\n${input.stdout.substring(0, 1000)}` : ''}

CURRENT FILES (showing relevant files):
${input.files.slice(0, 15).map(f => `--- ${f.path} ---\n${f.content.substring(0, 3000)}`).join('\n\n')}

${input.userPrompt ? `ORIGINAL USER REQUIREMENT: ${input.userPrompt}` : ''}${historyBlock}`;

            const { result, tokens } = await this.promptLLM(system, userPrompt, 'llama-3.3-70b-versatile', signal, strategy);

            const output = result as DebugOutput;
            this.log(`Root cause: [${output.category}] ${output.rootCause}. Confidence: ${output.confidence}. Patches: ${output.patches?.length || 0}`);

            return {
                success: true,
                data: output,
                tokens,
                confidence: output.confidence
            };
        } catch (error) {
            return {
                success: false,
                data: {
                    rootCause: 'DebugAgent internal failure',
                    explanation: error instanceof Error ? error.message : String(error),
                    patches: [],
                    confidence: 0,
                    category: 'unknown'
                },
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
}
