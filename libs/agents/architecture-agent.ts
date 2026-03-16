import { BaseAgent, AgentResponse } from '@agents/base-agent';
import { AgentContext } from '@shared-types/agent-context';
import { StrategyConfig } from '@services/agent-intelligence/strategy-engine';
import logger from '@config/logger';

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
    constructor() {
        super();
    }

    getName(): string {
        return 'ArchitectureAgent';
    }

    async execute(
        input: any,
        context: AgentContext,
        signal?: AbortSignal,
        strategy?: StrategyConfig
    ): Promise<AgentResponse> {
        const ctx = await context.get();
        const prompt = input?.prompt || ctx.prompt;
        const findings = ctx.metadata.findings || {};

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
            const llmResponse = await this.promptLLM(
                systemPrompt, 
                userPrompt, 
                strategy?.model || 'llama-3.3-70b-versatile', 
                signal, 
                strategy
            );
            
            const blueprint = llmResponse.result as ArchitectureBlueprint;

            return {
                success: true,
                data: blueprint,
                tokens: llmResponse.tokens,
                promptTokens: llmResponse.promptTokens,
                completionTokens: llmResponse.completionTokens
            };
        } catch (error) {
            logger.error({ error, agent: this.getName() }, 'Failed to generate architecture blueprint');
            return {
                success: false,
                error: `Failed to generate architecture: ${error instanceof Error ? error.message : String(error)}`,
                data: null
            };
        }
    }
}
