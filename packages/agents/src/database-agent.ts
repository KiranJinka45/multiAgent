import { BaseAgent } from './base-agent';
import { AgentRequest, AgentResponse } from '@libs/contracts';
import { StrategyConfig } from '@libs/utils';

export class DatabaseAgent extends BaseAgent {
    getName() { return 'DatabaseAgent'; }

    async execute(
        request: AgentRequest<{ isIncremental?: boolean, affectedFiles?: string[] }>, 
        signal?: AbortSignal, 
        strategy?: StrategyConfig
    ): Promise<AgentResponse> {
        const { prompt, context, params } = request;
        const start = Date.now();

        if (params.isIncremental) {
            const dbFiles = params.affectedFiles?.filter((f: string) => f.includes('schema') || f.includes('migration') || f.includes('seed'));
            if (!dbFiles || dbFiles.length === 0) {
                this.log(`Skipping Database schema generation (no database files affected in incremental build)`, { executionId: context.executionId });
                return { 
                    success: true, 
                    data: { schema: '', entities: [] }, 
                    artifacts: [],
                    metrics: { durationMs: Date.now() - start, tokensTotal: 0 }
                };
            }
        }

        this.log(`Designing optimized Supabase/PostgreSQL schema for: ${prompt}`, { executionId: context.executionId });
        try {
            const system = `You are a Senior Database Architect specialized in Supabase and PostgreSQL.
Your goal is to design a high-performance, normalized database schema.

REQUIREMENTS:
- Data normalization (3NF where appropriate).
- Performance indexing (B-tree, GIN, etc.) for frequent queries identified from planner input.
- Clear foreign key relationships and constraints.
- Scalability-first design.

OUTPUT:
Respond ONLY with a JSON object:
{
  "files": [
    { "path": "apps/api/supabase/migrations/20240101_init.sql", "content": "..." },
    { "path": "apps/api/prisma/schema.prisma", "content": "..." },
    { "path": "apps/api/src/db/models/user.ts", "content": "..." }
  ],
  "entities": ["list", "of", "table", "names"],
  "summary": "Brief explanation of schema design and indexing strategy"
}`;

            const userPrompt = `PROJECT REQUIREMENTS:
${prompt}

PLANNER INPUT:
${JSON.stringify(context.metadata.plan || {})}

FRONTEND/BACKEND CONTEXT:
${JSON.stringify(params.affectedFiles || [])}`;

            request.taskType = 'code-gen';
            const { result, tokens } = await this.promptLLM(system, userPrompt, request, signal, strategy);

            this.log(`Schema designed with tables: ${result.entities?.join(', ')}`, { executionId: context.executionId });
            return {
                success: true,
                data: result,
                artifacts: result.files?.map((f: { path: string, content: string }) => ({ path: f.path, content: f.content, type: 'infrastructure' })) || [],
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
