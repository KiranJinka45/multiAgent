import { AgentResponse } from '@services/base-agent';
import logger from '@configs/logger';
import { DatabaseAgent } from '@services/database-agent';
import { BackendAgent } from '@services/backend-agent';
import { FrontendAgent } from '@services/frontend-agent';
import { DeploymentAgent } from '@services/deployment-agent';
import { TestingAgent } from '@services/testing-agent';
import { ValidatorAgent } from '@services/validator-agent';
import { PlannerAgent } from '@services/planner-agent';
import { DebugAgent } from '@services/debug-agent';
import { CoderAgent } from '@services/coder-agent';

export interface TaskAgent {
    execute(payload: any, context?: any): Promise<AgentResponse<any>>;
}

export class AgentRegistry {
    private agents: Map<string, TaskAgent> = new Map();

    /**
     * Registers a specific agent subclass implementation against a common task action.
     */
    register(taskType: string, agent: TaskAgent) {
        this.agents.set(taskType, agent);
    }

    getAgent(taskType: string): TaskAgent | undefined {
        return this.agents.get(taskType);
    }

    hasAgent(taskType: string): boolean {
        return this.agents.has(taskType);
    }

    async runTaskDirectly(taskType: string, payload: any, context?: any): Promise<AgentResponse<any>> {
        const agent = this.getAgent(taskType);
        if (!agent) {
            return {
                success: false,
                data: null,
                logs: [],
                error: `No agent registered in AgentRegistry for task type: ${taskType}`
            };
        }

        try {
            logger.info({ taskType }, 'System dispatching to specialized Agent');
            return await agent.execute(payload, context);
        } catch (error) {
            logger.error({ error, taskType }, 'Specialized agent crashed during execution');
            return {
                success: false,
                data: null,
                logs: [],
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
}

// Global registry export
export const agentRegistry = new AgentRegistry();

// Auto-registration of core agents
agentRegistry.register('DatabaseAgent', new DatabaseAgent());
agentRegistry.register('BackendAgent', new BackendAgent());
agentRegistry.register('FrontendAgent', new FrontendAgent());
agentRegistry.register('DeploymentAgent', new DeploymentAgent());
agentRegistry.register('TestingAgent', new TestingAgent());
agentRegistry.register('ValidatorAgent', new ValidatorAgent());
