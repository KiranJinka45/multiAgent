import { BaseAgent, AgentResponse } from './index';
import { AgentContext } from '@libs/contracts';

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

    protected async run(
        input: {
            editRequest: string;
            projectContext: string;       // Summary from ProjectMemory
            currentFiles: { path: string; content: string }[];  // Only files relevant to edit
            techStack: { framework: string; styling: string; backend: string; database: string };
        },
        _context: AgentContext,
        signal?: AbortSignal
    ): Promise<AgentResponse<EditResult>> {
        void _context;
        this.log(`Processing incremental edit request: "${input.editRequest.substring(0, 80)}..."`);

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

TECH STACK: ${JSON.stringify(input.techStack)}

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
${input.projectContext}

CURRENT FILES (to modify):
${input.currentFiles.map(f => `--- ${f.path} ---\n${f.content.substring(0, 3000)}`).join('\n\n')}

USER REQUEST:
${input.editRequest}

Apply the minimal set of changes to fulfill this request. Output JSON.`;

            const { result, tokens } = await this.promptLLM(system, userPrompt, 'llama-3.3-70b-versatile', signal, undefined, _context);

            const editResult = result as EditResult;
            this.log(`Generated ${editResult.patches?.length || 0} patches. Explanation: ${editResult.explanation}`);

            return {
                success: true,
                data: editResult,
                tokens,
                logs: this.logs
            };
        } catch (error) {
            return {
                success: false,
                data: null as unknown as EditResult,
                logs: this.logs,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
}
