import { BaseAgent, AgentResponse } from './base-agent';
import { AgentContext } from '../types/agent-context';
import { StrategyConfig } from '../services/agent-intelligence/strategy-engine';

export interface TaskStep {
    id: number;
    title: string;
    description: string;
    agent: 'DatabaseAgent' | 'BackendAgent' | 'FrontendAgent' | 'DeploymentAgent' | 'TestingAgent';
    priority: 'critical' | 'high' | 'medium' | 'low';
    dependencies: number[];  // IDs of steps that must complete first
    estimatedComplexity: 'simple' | 'moderate' | 'complex';
    fileTargets: string[];   // Files this step will create or modify
}

export interface TaskPlan {
    projectName: string;
    summary: string;
    techStack: {
        framework: string;
        styling: string;
        backend: string;
        database: string;
        auth: string;
    };
    steps: TaskStep[];
    totalEstimatedFiles: number;
}

export class PlannerAgent extends BaseAgent {
    getName() { return 'PlannerAgent'; }

    async execute(
        input: { prompt: string; techStack?: Record<string, string> },
        _context: AgentContext,
        signal?: AbortSignal,
        strategy?: StrategyConfig
    ): Promise<AgentResponse<TaskPlan>> {
        void _context;
        this.log('Generating structured task plan from user prompt...');

        try {
            const system = `You are a Senior AI Software Architect acting as a Project Planner.
Given a user's application description, you must decompose it into a structured, ordered task plan.

Each task must be assigned to exactly one agent:
- DatabaseAgent: Schema design, migrations, seed data
- BackendAgent: API routes, server logic, middleware, auth setup
- FrontendAgent: UI components, pages, layouts, styling
- DeploymentAgent: Docker, CI/CD, hosting config
- TestingAgent: Unit tests, integration tests, E2E specs

Rules:
1. Surgical Patching: Prioritize modifying specific sections of template files using markers (e.g., @section: NAME) instead of full-file rewrites.
2. Guardrails: NEVER plan modifications to core config files (package.json, tsconfig.json, tailwind.config.ts) unless adding specific dependencies via provided tools.
3. Tech Stack Consistency: Always respect the chosen template's built-in layouts and structure.
4. Tasks must have correct dependency ordering (a page can't be built before its API route).
5. Each task should target specific files it will create or modify.
6. Prioritize critical infrastructure first (database → backend → frontend → testing → deployment).
7. For complex apps, break frontend into multiple tasks (layout, individual pages, shared components).
8. Include auth setup if the prompt mentions users, login, accounts, or dashboard.
9. Include payment setup if the prompt mentions pricing, subscription, or checkout.

Output strictly valid JSON matching this schema:
{
  "projectName": "string",
  "summary": "one-line project summary",
  "techStack": {
    "framework": "nextjs|react-vite|angular|static-html",
    "styling": "tailwind|shadcn|framer-motion|css-modules",
    "backend": "api-routes|express|nestjs|none",
    "database": "supabase|postgres|mongodb|none",
    "auth": "nextauth|supabase-auth|clerk|none"
  },
  "steps": [
    {
      "id": 1,
      "title": "step title",
      "description": "detailed description of what to build",
      "agent": "AgentName",
      "priority": "critical|high|medium|low",
      "dependencies": [],
      "estimatedComplexity": "simple|moderate|complex",
      "fileTargets": ["path/to/file.ts"]
    }
  ],
  "totalEstimatedFiles": 15
}`;

            const userPrompt = input.techStack
                ? `Project Description: ${input.prompt}\n\nUser-selected Tech Stack: ${JSON.stringify(input.techStack)}`
                : `Project Description: ${input.prompt}`;

            const { result, tokens } = await this.promptLLM(system, userPrompt, 'llama-3.3-70b-versatile', signal, strategy);
            this.log(`LLM raw response: ${JSON.stringify(result)}`);

            const plan = result as TaskPlan;
            this.log(`Generated task plan: "${plan.projectName}" with ${plan.steps?.length || 0} steps targeting ~${plan.totalEstimatedFiles} files.`);
            if (!plan.steps || plan.steps.length === 0) {
                this.log(`WARNING: Planner generated 0 steps. LLM Result: ${JSON.stringify(result)}`);
            }

            return {
                success: true,
                data: plan,
                tokens
            };
        } catch (error) {
            return {
                success: false,
                data: null as unknown as TaskPlan,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
}
