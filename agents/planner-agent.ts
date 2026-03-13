import { BaseAgent, AgentResponse } from './base-agent';
import { AgentContext } from '../types/agent-context';
import { StrategyConfig } from '../services/agent-intelligence/strategy-engine';

export interface TaskStep {
    id: number;
    title: string;
    description: string;
    agent: 'DatabaseAgent' | 'BackendAgent' | 'FrontendAgent' | 'DeploymentAgent' | 'TestingAgent';
    priority: 'critical' | 'high' | 'medium' | 'low';
    dependencies: number[];
    inputs?: string[];   // Specific keys needed from previous tasks (e.g., 'databaseSchema')
    outputs?: string[];  // Keys this task will provide to the global context (e.g., 'apiEndpoints')
    estimatedComplexity: 'simple' | 'moderate' | 'complex';
    fileTargets: string[];
    isPatch?: boolean;
    section?: string; // e.g., 'HERO', 'FEATURES' (matches template markers)
}

export interface TaskPlan {
    projectName: string;
    summary: string;
    templateId: 'nextjs-saas-premium' | 'nextjs-landing-v1';
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
        this.log('Generating structured project blueprint and template mapping...');

        try {
            const system = `You are the MultiAgent Lead Architect.
Your goal is to decompose a user's request into a deterministic build plan using a TEMPLATE-FIRST approach.

AVAILABLE TEMPLATES:
1. nextjs-landing-v1: Perfect for clean, white-themed landing pages, portfolios, and agency sites.
2. nextjs-saas-premium: Best for dark-themed SaaS apps, dashboards, and futuristic prototypes.

MANDATORY RULES:
1. SELECT ONE TEMPLATE: Based on the prompt's aesthetic (Dark/Sci-Fi -> saas-premium, Clean/Corporate -> landing-v1).
2. STRUCTURED PATCHING: For FrontendAgent tasks, specify "isPatch": true and the "section" (HERO, FEATURES, TESTIMONIALS, CTA, NAVIGATION, FOOTER).
3. AGENT COORDINATION: Define clear dependencies. Frontend tasks should "dependsOn" Backend tasks. Backend tasks should "dependsOn" Database tasks.
4. STATE SHARING: Use "inputs" and "outputs" to pass state between agents.
   - DatabaseAgent outputs: ["databaseSchema"]
   - BackendAgent inputs: ["databaseSchema"] | outputs: ["apiEndpoints"]
   - FrontendAgent inputs: ["apiEndpoints"]
5. GUARDRAILS: Never plan changes to package.json or tsconfig.json.

Output strictly valid JSON:
{
  "projectName": "string",
  "summary": "one-line project summary",
  "templateId": "nextjs-landing-v1|nextjs-saas-premium",
  "techStack": { "framework": "nextjs", "styling": "tailwind", "backend": "api-routes", "database": "supabase|none", "auth": "supabase|none" },
  "steps": [
    {
      "id": 1,
      "title": "Build Hero Section",
      "description": "Generate a high-converting hero for a coffee shop...",
      "agent": "FrontendAgent",
      "priority": "critical",
      "dependencies": [],
      "estimatedComplexity": "moderate",
      "fileTargets": ["app/page.tsx"],
      "isPatch": true,
      "section": "HERO"
    }
  ],
  "totalEstimatedFiles": 10
}`;

            const userPrompt = input.techStack
                ? `Project Description: ${input.prompt}\n\nUser-selected Tech Stack: ${JSON.stringify(input.techStack)}`
                : `Project Description: ${input.prompt}`;

            const { result, tokens } = await this.promptLLM(system, userPrompt, 'llama-3.1-8b-instant', signal, strategy);
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
