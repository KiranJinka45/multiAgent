import { BaseAgent } from './base-agent';
import { AgentRequest, AgentResponse } from '@packages/contracts';
import { StrategyConfig } from '@packages/utils';

export class FrontendAgent extends BaseAgent {
    getName() { return 'FrontendAgent'; }

    async execute(
        request: AgentRequest<{ 
            backendFiles?: { path: string; content: string }[], 
            isIncremental?: boolean, 
            affectedFiles?: string[],
            isPatch?: boolean,
            section?: string 
        }>, 
        signal?: AbortSignal, 
        strategy?: StrategyConfig
    ): Promise<AgentResponse> {
        const { prompt, context, params } = request;
        const start = Date.now();

        if (params.isIncremental && !params.isPatch) {
            const frontendFiles = params.affectedFiles?.filter(f => f.includes('page') || f.includes('layout') || f.includes('component') || f.includes('tailwind') || f.endsWith('.css'));
            if (!frontendFiles || frontendFiles.length === 0) {
                this.log(`Skipping Frontend generation (no frontend files affected)`, { executionId: context.executionId });
                return { 
                    success: true, 
                    data: { files: [] }, 
                    artifacts: [],
                    metrics: { durationMs: Date.now() - start, tokensTotal: 0 } 
                };
            }
        }
        
        if (params.isPatch && params.section) {
            this.log(`Generating SURGICAL PATCH for section: ${params.section}`, { executionId: context.executionId });
            const system = `You are a Senior UI/UX Engineer.
Design a premium, responsive UI section using Tailwind.
Output strictly valid JSON: { "section": "...", "content": "JSX code..." }`;
            
            try {
                request.taskType = 'code-gen';
                const { result, tokens } = await this.promptLLM(system, `User Request: ${prompt}`, request, signal, strategy);
                return {
                    success: true,
                    data: { patch: result },
                    artifacts: [],
                    metrics: { durationMs: Date.now() - start, tokensTotal: tokens }
                };
            } catch (err) {
                return { success: false, data: null, artifacts: [], metrics: { durationMs: 0, tokensTotal: 0 }, error: String(err) };
            }
        }

        this.log(`Generating FULL Frontend UI modules...`, { executionId: context.executionId });
        try {
            const system = `You are a Senior Frontend Architect specialized in Next.js (App Router), TypeScript, and Tailwind CSS.
Your goal is to generate a production-ready, high-performance UI based on the planner's input.

ARCHITECTURE:
- Modular, component-based design.
- Code splitting and lazy loading via Next.js dynamic imports.
- Responsive design (mobile-first) using Tailwind.
- API integration layer using React Query or standardized fetch hooks.
- State management using Zustand or React Context where appropriate.

OPTIMIZATIONS:
- SEO best practices (metadata, semantic HTML).
- Performance-first rendering (ISR/SSR where beneficial).
- Clean, type-safe code (No 'any').

OUTPUT:
Respond ONLY with a JSON object:
{
  "files": [
    { "path": "apps/web/app/page.tsx", "content": "..." },
    { "path": "apps/web/components/ui/Button.tsx", "content": "..." },
    { "path": "apps/web/hooks/useApi.ts", "content": "..." }
  ],
  "summary": "Brief explanation of architectural choices"
}`;

            const userPrompt = `PROJECT REQUIREMENTS:
${prompt}

PLANNER INPUT:
${JSON.stringify(context.metadata.plan || {})}

BACKEND CONTEXT:
${JSON.stringify(params.backendFiles || [])}`;

            request.taskType = 'code-gen';
            const { result, tokens } = await this.promptLLM(system, userPrompt, request, signal, strategy);

            this.log(`Generated ${result.files?.length || 0} frontend files`, { executionId: context.executionId });
            return {
                success: true,
                data: result,
                artifacts: result.files.map((f: { path: string, content: string }) => ({ path: f.path, content: f.content, type: 'code' })),
                metrics: {
                    durationMs: Date.now() - start,
                    tokensTotal: tokens
                }
            };
        } catch (error) {
            return {
                success: false,
                data: null,
                artifacts: [],
                metrics: { durationMs: 0, tokensTotal: 0 },
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
}
