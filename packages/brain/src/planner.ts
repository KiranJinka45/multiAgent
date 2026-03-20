import { BrainContext } from './context-builder';
import logger from '@libs/utils';
import { BaseAgent } from '@libs/agents';
import { AgentRequest, AgentResponse } from '@libs/contracts';

export interface Task {
    id: string;
    agent: string;
    description: string;
    dependencies: string[];
}

export interface DeploymentPlan {
    tasks: Task[];
    reasoning: string;
}

export class Planner extends BaseAgent {
    getName() { return 'BrainPlanner'; }

    /**
     * Required by BaseAgent.
     * Can be used to run a plan as a single agent execution if needed.
     */
    async execute(request: AgentRequest<BrainContext>): Promise<AgentResponse<DeploymentPlan>> {
        const plan = await this.plan(request.params, request.tenantId);
        return {
            success: true,
            data: plan,
            artifacts: [],
            metrics: { durationMs: 0, tokensTotal: 0 }
        };
    }

    async plan(context: BrainContext, tenantId: string): Promise<DeploymentPlan> {
        this.log('🧠 Brain reasoning about the deployment strategy...', { prompt: context.prompt });

        const system = `You are a Senior AI Systems Architect.
Your goal is to decompose a user prompt into a high-level Task Graph (DAG).

RESOURCES:
- Past Memories: ${JSON.stringify(context.memories)}

TASK:
- Break the requirement into discrete agent tasks.
- Agents available: planner, frontend, backend, database, security, validator.
- Define dependencies between tasks.

OUTPUT FORMAT (JSON):
{
  "reasoning": "Explain your architectural decisions",
  "tasks": [
    { "id": "task1", "agent": "...", "description": "...", "dependencies": [] },
    { "id": "task2", "agent": "...", "description": "...", "dependencies": ["task1"] }
  ]
}`;

        try {
            const request: AgentRequest = {
                prompt: context.prompt,
                context: {
                    executionId: 'brain-planning',
                    projectId: 'brain-planning',
                    userId: 'system',
                    vfs: {},
                    history: [],
                    metadata: {},
                    getExecutionId() { return 'brain-planning'; },
                    getProjectId() { return 'brain-planning'; }
                },
                tenantId,
                taskType: 'planning',
                params: {}
            };
            const { result } = await this.promptLLM(system, context.prompt, request);
            return result as DeploymentPlan;
        } catch (err) {
            logger.error({ err }, '[Planner] AI planning failed. Falling back to default plan.');
            return this.getDefaultPlan();
        }
    }

    private getDefaultPlan(): DeploymentPlan {
        return {
            reasoning: "Fallback to default linear strategy",
            tasks: [
                { id: 'plan', agent: 'planner', description: 'Initial decomposition', dependencies: [] },
                { id: 'fe', agent: 'frontend', description: 'UI generation', dependencies: ['plan'] },
                { id: 'be', agent: 'backend', description: 'Logic generation', dependencies: ['plan'] },
                { id: 'db', agent: 'database', description: 'Schema generation', dependencies: ['plan'] },
                { id: 'sec', agent: 'security', description: 'Hardening', dependencies: ['fe', 'be', 'db'] }
            ]
        };
    }
}
