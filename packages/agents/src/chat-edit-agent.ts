import { BaseAgent, AgentResponse, AgentRequest } from './base-agent';
import { AgentContext, EditParams } from '@libs/contracts';

export interface EditPatch {
    path: string;
    content: string;
    action: 'create' | 'modify' | 'delete';
    reason: string;
}

export interface EditResult {
    explanation: string;
    patches: EditPatch[];
    newFeatures: string[];
}

/**
 * ChatEditAgent handles incremental, conversational project modifications.
 * 
 * Instead of regenerating the entire project, it:
 * 1. Receives the user's edit request + current project context
 * 2. Analyzes which files need to change
 * 3. Outputs surgical patches for only the affected files
 * 
 * This is the core of the "chat-based editing" experience (like Lovable/Cursor).
 */
export class ChatEditAgent extends BaseAgent {
    getName() { return 'ChatEditAgent'; }

    async execute(
        request: AgentRequest<{
            editRequest: string;
            projectContext: string;
            currentFiles: { path: string; content: string }[];
            techStack: { framework: string; styling: string; backend: string; database: string };
        }>,
        signal?: AbortSignal
    ): Promise<AgentResponse<EditResult>> {
        const { params, context } = request;
        const start = Date.now();
        this.log(`Processing incremental edit request: "${params.editRequest.substring(0, 80)}..."`);

        try {
            const system = `You are a Senior AI Full-Stack Engineer working on an existing project.
The user has an existing, working codebase and wants to make a specific change.

Your job is to modify ONLY the files necessary to fulfill the request.
Do NOT regenerate the entire project. Do NOT touch files unrelated to the request.

RULES:
1. Preserve all existing functionality — do not break working code.
2. Follow the existing code style and conventions exactly.
3. If the change requires a new file, create it with action "create".
4. If modifying a file, include the COMPLETE new file content (not just the diff).
5. If a file should be removed, use action "delete" with empty content.
6. Ensure all imports are valid and reference existing project files.
7. Use the tech stack specified — do not switch frameworks or libraries.

TECH STACK: ${JSON.stringify(params.techStack)}

OUTPUT FORMAT (strict JSON):
{
  "explanation": "Brief description of what was changed and why",
  "patches": [
    {
      "path": "relative/path/to/file.tsx",
      "content": "complete file content after modification",
      "action": "create|modify|delete",
      "reason": "why this file was changed"
    }
  ],
  "newFeatures": ["list", "of", "new", "features", "added"]
}`;

            const userPrompt = `
${params.projectContext}

CURRENT FILES (to modify):
${params.currentFiles.map(f => `--- ${f.path} ---\n${f.content.substring(0, 3000)}`).join('\n\n')}

USER REQUEST:
${params.editRequest}

Apply the minimal set of changes to fulfill this request. Output JSON.`;

            request.taskType = 'code-gen';
            const { result, tokens } = await this.promptLLM(system, userPrompt, request, signal);

            const editResult = result as EditResult;
            this.log(`Generated ${editResult.patches?.length || 0} patches. Explanation: ${editResult.explanation}`);

            return {
                success: true,
                data: editResult,
                artifacts: editResult.patches.map(p => ({ path: p.path, content: p.content, type: 'code' })),
                metrics: { durationMs: Date.now() - start, tokensTotal: tokens }
            };
        } catch (error) {
            return {
                success: false,
                data: null as unknown as EditResult,
                artifacts: [],
                metrics: { durationMs: 0, tokensTotal: 0 },
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
}
