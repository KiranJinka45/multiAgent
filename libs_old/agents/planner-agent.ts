import { BaseAgent, AgentResponse } from '@agents/base-agent';
import { AgentContext } from '@shared-types/agent-context';
import { StrategyConfig } from '@services/agent-intelligence/strategy-engine';

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
        input: { prompt: string; context?: string },
        _context: AgentContext,
        signal?: AbortSignal,
        strategy?: StrategyConfig
    ): Promise<AgentResponse<PlannerOutput>> {
        this.log('Decomposing mission requirements into a structured plan...');

        const system = `You are a Lead Platform Architect (Aion Planner).
Your goal is to decompose a user's mission prompt into a directed acyclic graph (DAG) of specialized agent tasks.

Task Types available:
- architect: High-level design and tech stack selection.
- frontend: Generate React/Next.js UI components.
- backend: Generate API routes, models, and logic.
- devops: Generate Docker and Terraform configurations.

Rules:
1. Break the work into logical, manageable nodes.
2. Define dependencies (dependsOn) clearly (e.g., frontend depends on architect).
3. Specify inputs each task needs from its dependencies.
4. Output ONLY strictly valid JSON.

Output Format:
{
  "blueprint": { "techStack": "...", "description": "..." },
  "tasks": [
    {
      "id": "task_1",
      "type": "architect",
      "title": "...",
      "description": "...",
      "payload": { "prompt": "..." }
    },
    {
      "id": "task_2",
      "type": "frontend",
      "dependsOn": ["task_1"],
      "title": "...",
      "description": "...",
      "payload": { "prompt": "..." }
    }
  ]
}`;

        const userPrompt = `USER MISSION: ${input.prompt}
ADDITIONAL CONTEXT: ${input.context || 'None'}`;

        try {
            const { result, tokens } = await this.promptLLM(system, userPrompt, 'llama-3.3-70b-versatile', signal, strategy);
            const output = result as TaskPlan;

            this.log(`Plan generated with ${output.steps?.length || 0} steps.`);

            return {
                success: true,
                data: output,
                tokens
            };
        } catch (error) {
            return {
                success: false,
                data: { projectName: 'fail', templateId: 'fail', techStack: { framework: '', styling: '', backend: '', database: '' }, steps: [] },
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
}
