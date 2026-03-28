import { BaseAgent, AgentResponse } from './base-agent';
import { AgentContext } from '@packages/contracts';

export interface CodeFile {
    path: string;
    content: string;
}

export interface CoderOutput {
    files: CodeFile[];
    reasoning: string;
}

/**
 * CoderAgent — Specialized agent for generating high-quality source code
 * from atomic task descriptions. Operates on individual tasks provided
 * by the PlannerAgent's task decomposition.
 */
export class CoderAgent extends BaseAgent {
    getName() { return 'CoderAgent'; }

    protected async run(
        input: {
            taskTitle: string;
            taskDescription: string;
            fileTargets: string[];
            techStack: Record<string, string>;
            existingFiles?: CodeFile[];
            previousFailures?: string[];
        },
        _context: AgentContext,
        signal?: AbortSignal,
        strategy?: StrategyConfig
    ): Promise<AgentResponse<CoderOutput>> {
        void _context;
        this.log(`Generating code for task: "${input.taskTitle}"`);

        try {
            const failureContext = input.previousFailures?.length
                ? `\n\nPREVIOUS FAILED ATTEMPTS (DO NOT repeat these mistakes):\n${input.previousFailures.map((f, i) => `${i + 1}. ${f}`).join('\n')}`
                : '';

            const existingContext = input.existingFiles?.length
                ? `\n\nEXISTING CODEBASE FILES (reference these for imports, types, and consistency):\n${input.existingFiles.map(f => `--- ${f.path} ---\n${f.content.substring(0, 2000)}`).join('\n\n')}`
                : '';

            const system = `You are an elite autonomous AI Software Engineer (like Devin).
You write production-grade, type-safe, well-structured code.

Tech Stack: ${JSON.stringify(input.techStack)}

Rules:
1. DETERMINISTIC PATCHING: If the target file contains anchors (e.g. <!-- ANCHOR_START -->), only output the content for that bracket.
2. Output COMPLETE, compilable files or patches — never leave TODOs or placeholder comments.
3. Use proper TypeScript types (no 'any' unless truly unavoidable).
4. Include all necessary imports for the code you generate.
5. Follow the project's existing patterns and naming conventions.
6. For React/Next.js components: use "use client" where needed, proper prop types, accessible HTML.
7. For API routes: proper error handling, input validation, typed responses.
8. Never import from non-existent modules — use only standard libraries and the project's installed packages.

Output strictly valid JSON:
{
  "files": [
    { "path": "relative/path/to/file.ts", "content": "complete file content" }
  ],
  "reasoning": "Brief explanation of architectural decisions made"
}`;

            const userPrompt = `TASK: ${input.taskTitle}
DESCRIPTION: ${input.taskDescription}
TARGET FILES: ${input.fileTargets.join(', ')}${existingContext}${failureContext}`;

            const { result, tokens } = await this.promptLLM(system, userPrompt, 'llama-3.3-70b-versatile', signal, undefined, _context);

            const output = result as CoderOutput;
            this.log(`Generated ${output.files?.length || 0} files. Reasoning: ${output.reasoning?.substring(0, 100)}...`);

            return {
                success: true,
                data: output,
                tokens,
                logs: this.logs
            };
        } catch (error) {
            return {
                success: false,
                data: { files: [], reasoning: '' },
                logs: this.logs,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
}
