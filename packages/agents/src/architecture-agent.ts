import { BaseAgent, AgentResponse, AgentRequest } from './base-agent';
import { AgentContext, EditParams } from '@libs/contracts';
import { StrategyConfig } from '@libs/utils';

export interface ArchitectureBlueprint {
    stack: {
        framework: string;
        ui: string;
        database: string;
        stateManagement?: string;
        auth?: string;
    };
    schema: string;
    folders: string[];
    justification: string;
}

export class ArchitectureAgent extends BaseAgent {
    getName(): string {
        return 'ArchitectureAgent';
    }

    async execute(
        request: AgentRequest,
        signal?: AbortSignal,
        strategy?: StrategyConfig
    ): Promise<AgentResponse<ArchitectureBlueprint>> {
        const { prompt, context } = request;
        const start = Date.now();
        const findings = context.metadata.findings || {};

        const systemPrompt = `You are a Principal Software Architect.
Your task is to define a high-level technical blueprint for a project based on the user's requirements and preliminary research.

Respond ONLY with a JSON object in this format:
{
    "stack": {
        "framework": "e.g., Next.js 14 (App Router)",
        "ui": "e.g., Tailwind CSS + Shadcn UI",
        "database": "e.g., Supabase (PostgreSQL)",
        "stateManagement": "e.g., Zustand",
        "auth": "e.g., NextAuth.js"
    },
    "schema": "Describe the core database tables and relationships",
    "folders": ["list", "of", "core", "folders"],
    "justification": "Short reason for these choices"
}`;

        const userPrompt = `RESEARCH FINDINGS:
${JSON.stringify(findings, null, 2)}

REQUIREMENTS:
${prompt}`;

        try {
            request.taskType = 'planning';
            const { result, tokens } = await this.promptLLM(
                systemPrompt, 
                userPrompt, 
                request, 
                signal, 
                strategy
            );

            const blueprint = result as ArchitectureBlueprint;

            return {
                success: true,
                data: blueprint,
                artifacts: [],
                metrics: { durationMs: Date.now() - start, tokensTotal: tokens }
            };
        } catch (error) {
            return {
                success: false,
                data: null as any,
                artifacts: [],
                metrics: { durationMs: 0, tokensTotal: 0 },
                error: `Failed to generate architecture: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }
}
