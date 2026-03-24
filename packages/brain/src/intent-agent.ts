import { BaseAgent, AgentResponse } from './index';
import { AgentContext } from '@libs/contracts';

export interface IntentResult {
    templateId: 'nextjs-tailwind-basic' | 'fullstack-app';
    projectName: string;
    description: string;
    features: string[];
    branding: {
        primaryColor: string;
        theme: 'dark' | 'light';
    };
}

export class IntentDetectionAgent extends BaseAgent {
    getName() { return 'IntentDetectionAgent'; }

    protected async run(
        input: { query: string },
        _context: AgentContext,
        signal?: AbortSignal,
        strategy?: any
    ): Promise<AgentResponse> {
        this.log('Detecting user intent and selecting template...');

        // The original prompt used `input.prompt` and `input.techStack`.
        // With the new `input: { query: string }`, `input.prompt` becomes `input.query`
        // and `input.techStack` is no longer available.
        // I will adapt the system prompt to use `input.query` and remove the techStack reference.
        const system = `You are a High-Speed Intent Classifier.
Your goal is to map a user's prompt to a prebuilt project template and extract key branding/feature requirements.

User-selected or recommended Tech Stack: ${input.techStack ? JSON.stringify(input.techStack) : 'None'}
If a tech stack is provided, prioritize selecting templates or features that align with it.

Available Templates:
- nextjs-tailwind-basic: Best for landing pages, simple portfolios, and marketing sites using Next.js and Tailwind.
- fullstack-app: Best for dashboards, SaaS, or apps requiring a database, auth (Supabase), and complex CRUD.

Output strictly valid JSON:
{
  "templateId": "nextjs-tailwind-basic",
  "projectName": "string",
  "description": "Short project summary",
  "features": ["string"],
  "branding": {
    "primaryColor": "CSS color (e.g. #3b82f6)",
    "theme": "dark" | "light"
  }
}`;

        try {
            const { result, tokens } = await this.promptLLM(system, input.prompt, 'llama-3.3-70b-versatile', signal, undefined, _context);
            const intent = result as IntentResult;

            this.log(`Intent detected: Template [${intent.templateId}] selected for project [${intent.projectName}].`);

            return {
                success: true,
                data: intent,
                tokens,
                logs: this.logs
            };
        } catch (error) {
            return {
                success: false,
                data: null as any,
                logs: this.logs,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
}
