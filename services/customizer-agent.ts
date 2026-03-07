import { BaseAgent, AgentResponse } from '@services/base-agent';
import { AgentContext } from '@shared-types/agent-context';

export interface CustomizationPatch {
    path: string;
    content: string;
    explanation: string;
}

export class CustomizerAgent extends BaseAgent {
    getName() { return 'CustomizerAgent'; }

    async execute(
        input: {
            prompt: string;
            templateId: string;
            files: { path: string; content: string }[];
            branding: any;
            features: string[];
        },
        _context: AgentContext,
        signal?: AbortSignal
    ): Promise<AgentResponse<{ patches: CustomizationPatch[] }>> {
        this.log(`Applying surgical customization to [${input.templateId}]...`);

        const system = `You are a Surgical Code Customization Agent.
Your task is to modify a prebuilt codebase to match a user's specific requirements.
DO NOT rewrite the entire file if only small changes are needed.
Focus on:
1. Branding: Updating hero sections, titles, and theme colors.
2. Features: Adding or modifying components to match the requested features.
3. Content: Replacing placeholder text with relevant copy for the user's project.

You will be provided with the user prompt and a list of files from the template.
Output strictly valid JSON with full file contents for the modified files:
{
  "patches": [
    { "path": "path/to/file.tsx", "content": "Full modified file content", "explanation": "Why this change was made" }
  ]
}`;

        const userPrompt = `User Prompt: ${input.prompt}
Target Branding: ${JSON.stringify(input.branding)}
Target Features: ${input.features.join(', ')}

Files to customize:
${input.files.map(f => `--- ${f.path} ---\n${f.content}`).join('\n\n')}`;

        try {
            const { result, tokens } = await this.promptLLM(system, userPrompt, 'llama-3.1-8b-instant', signal); // Use faster model for speed
            const patches = result.patches as CustomizationPatch[];

            this.log(`Generated ${patches.length} surgical patches.`);

            return {
                success: true,
                data: { patches },
                tokens,
                logs: this.logs
            };
        } catch (error) {
            return {
                success: false,
                data: { patches: [] },
                logs: this.logs,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
}
