import { BaseAgent } from './base-agent';
import { AgentRequest, AgentResponse, AgentContext, CoderParams } from '@libs/contracts';

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

    async execute(
        request: AgentRequest<CoderParams & { 
            taskTitle: string; 
            existingFiles?: CodeFile[];
            previousFailures?: string[];
            techStack: Record<string, string>;
        }>,
        signal?: AbortSignal
    ): Promise<AgentResponse<CoderOutput>> {
        const { prompt, context, params } = request;
        const start = Date.now();
        this.log(`Generating code for task: "${params.taskTitle}"`, { executionId: context.executionId });

        try {
            const failureContext = params.previousFailures?.length
                ? `\n\nPREVIOUS FAILED ATTEMPTS (DO NOT repeat these mistakes):\n${params.previousFailures.map((f, i) => `${i + 1}. ${f}`).join('\n')}`
                : '';

            const existingContext = params.existingFiles?.length
                ? `\n\nEXISTING CODEBASE FILES (reference these for imports, types, and consistency):\n${params.existingFiles.map(f => `--- ${f.path} ---\n${f.content.substring(0, 2000)}`).join('\n\n')}`
                : '';

            const system = `You are an elite autonomous AI Software Engineer (like Devin).
You write production-grade, type-safe, well-structured code.

Tech Stack: ${JSON.stringify(params.techStack)}

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

            const userPrompt = `TASK: ${params.taskTitle}
DESCRIPTION: ${params.instructions}
TARGET FILES: ${params.fileTargets.join(', ')}${existingContext}${failureContext}`;

            request.taskType = 'code-gen';
            const { result, tokens } = await this.promptLLM(system, userPrompt, request, signal);

            const output = result as CoderOutput;
            this.log(`Generated ${output.files?.length || 0} files.`, { executionId: context.executionId });

            return {
                success: true,
                data: output,
                artifacts: output.files.map(f => ({ path: f.path, content: f.content, type: 'code' })),
                metrics: { durationMs: Date.now() - start, tokensTotal: tokens }
            };
        } catch (error) {
            return {
                success: false,
                data: { files: [], reasoning: '' },
                artifacts: [],
                metrics: { durationMs: 0, tokensTotal: 0 },
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
}
