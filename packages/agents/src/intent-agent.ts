import { BaseAgent } from './base-agent';
import { AgentContext, IntentParams, AgentRequest, AgentResponse } from '@packages/contracts';

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

    async execute(
        request: AgentRequest<{ techStack?: Record<string, string> }>,
        signal?: AbortSignal
    ): Promise<AgentResponse<IntentResult>> {
        const { prompt, context, params } = request;
        const start = Date.now();
        this.log('Detecting user intent and selecting template...', { executionId: context.executionId });

        const system = `You are a High-Speed Intent Classifier.
Your goal is to map a user's prompt to a prebuilt project template and extract key branding/feature requirements.

User-selected or recommended Tech Stack: ${params.techStack ? JSON.stringify(params.techStack) : 'None'}
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
            request.taskType = 'planning';
            const { result, tokens } = await this.promptLLM(system, prompt, request, signal);
            const intent = result as IntentResult;

            this.log(`Intent detected: Template [${intent.templateId}] selected for project [${intent.projectName}].`, { executionId: context.executionId });

            return {
                success: true,
                data: intent,
                artifacts: [],
                metrics: { durationMs: Date.now() - start, tokensTotal: tokens }
            };
        } catch (error) {
            return {
                success: false,
                data: null as any,
                artifacts: [],
                metrics: { durationMs: 0, tokensTotal: 0 },
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
}
