import { BaseAgent } from './base-agent';
import { AgentRequest, AgentResponse } from '@libs/contracts';
import { StrategyConfig } from '@libs/utils';

export class BackendAgent extends BaseAgent {
    getName() { return 'BackendAgent'; }

    async execute(
        request: AgentRequest<{ 
            schema?: string, 
            isIncremental?: boolean, 
            affectedFiles?: string[] 
        }>, 
        signal?: AbortSignal, 
        strategy?: StrategyConfig
    ): Promise<AgentResponse> {
        const { prompt, context, params } = request;
        const start = Date.now();

        if (params.isIncremental) {
            const beFiles = params.affectedFiles?.filter(f => f.includes('api/') || f.includes('middleware') || f.includes('lib/'));
            if (!beFiles || beFiles.length === 0) {
                this.log(`Skipping Backend generation (no backend files affected in incremental build)`, { executionId: context.executionId });
                return { 
                    success: true, 
                    data: { files: [] }, 
                    artifacts: [],
                    metrics: { durationMs: Date.now() - start, tokensTotal: 0 }
                };
            }
        }

        this.log(`Generating Backend API and logic based on schema...`, { executionId: context.executionId });
        try {
            const system = `You are a Senior Backend Architect specialized in Node.js (Express/NestJS) and Spring Boot.
Your goal is to generate scalable, production-ready backend services.

ARCHITECTURE:
- Clean Architecture (Controller → Service → Repository).
- RESTful API design with proper versioning (e.g., /api/v1/...).
- Robust Input Validation (e.g., Zod, Joi, or Hibernate Validator).
- Centralized Error Handling middleware.

PERFORMANCE & SCALABILITY:
- Caching strategy using Redis.
- Async processing (e.g., BullMQ, RabbitMQ, or Spring @Async).
- Database connection pooling and optimization.

OUTPUT:
Respond ONLY with a JSON object:
{
  "files": [
    { "path": "apps/api/src/controllers/user.controller.ts", "content": "..." },
    { "path": "apps/api/src/services/user.service.ts", "content": "..." },
    { "path": "apps/api/src/repositories/user.repository.ts", "content": "..." },
    { "path": "apps/api/src/middleware/error.handler.ts", "content": "..." },
    { "path": "apps/api/config/redis.config.ts", "content": "..." }
  ],
  "summary": "Brief explanation of architectural decisions"
}`;

            const userPrompt = `PROJECT REQUIREMENTS:
${prompt}

PLANNER INPUT (PLAN):
${JSON.stringify(context.metadata.plan || {})}

DATABASE SCHEMA:
${params.schema || 'No explicit schema provided'}`;

            request.taskType = 'code-gen';
            const { result, tokens } = await this.promptLLM(system, userPrompt, request, signal, strategy);

            const files = result.files || [];
            this.log(`Generated ${files.length} backend files`, { executionId: context.executionId });
            
            return {
                success: true,
                data: {
                    fileCount: files.length,
                    paths: files.map((f: { path: string }) => f.path)
                },
                artifacts: files.map((f: { path: string, content: string }) => ({ path: f.path, content: f.content, type: 'code' })),
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
