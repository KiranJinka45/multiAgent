import { BaseAgent } from './base-agent';
import { AgentRequest, AgentResponse, PlannerParams } from '@libs/contracts';
import { StrategyConfig } from '@libs/utils';

export interface TaskStep {
    id: number | string;
    title: string;
    description: string;
    agent: string;
    dependencies: (number | string)[];
    inputs?: string[];
    outputs?: string[];
    fileTargets?: string[];
    isPatch?: boolean;
    section?: string;
}

export interface TaskPlan {
    projectName: string;
    appSummary: string;
    featureBreakdown: string[];
    frontendRequirements: string[];
    backendApis: { endpoint: string; method: string; description: string }[];
    databaseSchema: string;
    authAndRoles: string;
    deploymentPlan: string;
    templateId: string;
    techStack: {
        framework: string;
        styling: string;
        backend: string;
        database: string;
    };
    steps: TaskStep[];
}

export type PlannerOutput = TaskPlan;

/**
 * PlannerAgent
 * 
 * The "Brain" of the PEC architecture.
 * It decomposes high-level user requirements into a structured TaskGraph.
 */
export class PlannerAgent extends BaseAgent {
    getName() { return 'PlannerAgent'; }

    async execute(
        request: AgentRequest<PlannerParams>,
        signal?: AbortSignal,
        strategy?: StrategyConfig
    ): Promise<AgentResponse<PlannerOutput>> {
        const { prompt, context } = request;
        this.log('Decomposing mission requirements into a structured plan...', { executionId: context.executionId });

        const system = `You are an elite Lead Platform Architect (Planner Agent).
Your goal is to convert a user's app idea into a structured, orchestration-ready execution plan.

TASK:
- Convert the prompt into a DAG (Directed Acyclic Graph) of specialized agent tasks.
- Keep modules independent and ensure clear contracts between them.
- Identify tasks that can run in parallel.

OUTPUT FORMAT (must be valid JSON):
{
  "projectName": "Name of the project",
  "appSummary": "Brief overview of the app idea",
  "featureBreakdown": ["List", "of", "key", "features"],
  "frontendRequirements": ["List", "of", "UI/UX", "needs"],
  "backendApis": [
    { "endpoint": "/api/...", "method": "GET/POST/...", "description": "..." }
  ],
  "databaseSchema": "Description of tables and relationships",
  "authAndRoles": "Description of authentication and RBAC strategy",
  "deploymentPlan": "CI/CD and hosting strategy",
  "templateId": "...",
  "techStack": { "framework": "...", "styling": "...", "backend": "...", "database": "..." },
  "steps": [
    {
      "id": "task_1",
      "agent": "DatabaseAgent | BackendAgent | FrontendAgent | SecurityAgent | DeploymentAgent | MonitoringAgent",
      "title": "Database Schema Design",
      "description": "Design the initial database schema and migrations.",
      "dependencies": [],
      "fileTargets": ["apps/api/prisma/schema.prisma", "apps/api/supabase/migrations/init.sql"]
    }
  ]
}

IMPORTANT: All 'fileTargets' MUST be prefixed with the correct app directory:
- Frontend: apps/web/...
- Backend/Database/Security: apps/api/...
- Shared Packages: packages/...`;

        const userPrompt = `USER MISSION: ${prompt}
ADDITIONAL CONTEXT: ${JSON.stringify(context.metadata) || 'None'}`;

        try {
            const start = Date.now();
            request.taskType = 'planning';
            const { result, tokens } = await this.promptLLM(system, userPrompt, request, signal, strategy);
            const output = result as TaskPlan;

            this.log(`Plan generated with ${output.steps?.length || 0} steps.`, { executionId: context.executionId });

            return {
                success: true,
                data: output,
                artifacts: [],
                metrics: {
                    durationMs: Date.now() - start,
                    tokensTotal: tokens
                }
            };
        } catch (error) {
            return {
                success: false,
                data: { 
                    projectName: 'fail', 
                    appSummary: 'failed to generate', 
                    featureBreakdown: [], 
                    frontendRequirements: [], 
                    backendApis: [], 
                    databaseSchema: '', 
                    authAndRoles: '', 
                    deploymentPlan: '', 
                    templateId: 'fail', 
                    techStack: { framework: '', styling: '', backend: '', database: '' }, 
                    steps: [] 
                },
                artifacts: [],
                metrics: { durationMs: 0, tokensTotal: 0 },
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
}
