import { BaseAgent, AgentResponse, AgentRequest } from './base-agent';
import { AgentContext, CustomizerParams } from '@packages/contracts';

export interface CustomizationPatch {
    path: string;
    content: string;
    explanation: string;
}

export class CustomizerAgent extends BaseAgent {
    getName() { return 'CustomizerAgent'; }

    async execute(
        request: AgentRequest<{
            prompt: string;
            templateId: string;
            files: { path: string; content: string }[];
            branding: any;
            features: string[];
        }>,
        signal?: AbortSignal
    ): Promise<AgentResponse<{ patches: CustomizationPatch[] }>> {
        const { params, context } = request;
        const start = Date.now();
        this.log(`Applying surgical customization to [${params.templateId}]...`);

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

        const userPrompt = `User Prompt: ${params.prompt}
Target Branding: ${JSON.stringify(params.branding)}
Target Features: ${params.features.join(', ')}

Files to customize:
${params.files.map(f => `--- ${f.path} ---\n${f.content}`).join('\n\n')}`;

        try {
            request.taskType = 'code-gen';
            const { result, tokens } = await this.promptLLM(system, userPrompt, request, signal); 
            const patches = result.patches as CustomizationPatch[];

            this.log(`Generated ${patches.length} surgical patches.`);

            return {
                success: true,
                data: { patches },
                artifacts: patches.map(p => ({ path: p.path, content: p.content, type: 'code' })),
                metrics: { durationMs: Date.now() - start, tokensTotal: tokens }
            };
        } catch (error) {
            return {
                success: false,
                data: { patches: [] },
                artifacts: [],
                metrics: { durationMs: 0, tokensTotal: 0 },
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
}
