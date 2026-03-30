import { AgentResponse } from '@packages/brain/base-agent';
import { DatabaseAgent } from '@packages/brain/database-agent';
import { BackendAgent } from '@packages/brain/backend-agent';
import { FrontendAgent } from '@packages/brain/frontend-agent';
import { DeploymentAgent } from '@packages/brain/deploy-agent';
import { TestingAgent } from '@packages/brain/testing-agent';
import { ValidatorAgent } from '@packages/brain/validator-agent';
import { logger, StrategyConfig } from '@packages/utils/server';
import { AgentContext } from '@packages/contracts';

export interface TaskAgent {
    execute(payload: any, context?: AgentContext, signal?: AbortSignal, strategy?: StrategyConfig): Promise<AgentResponse<any>>;
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

    async runTaskDirectly(taskType: string, payload: any, context?: AgentContext, signal?: AbortSignal, strategy?: StrategyConfig): Promise<AgentResponse<any>> {
        const agent = this.getAgent(taskType);
        if (!agent) {
            return {
                success: false,
                data: null,
                error: `No agent registered in AgentRegistry for task type: ${taskType}`
            };
        }

        try {
            logger.info({ taskType, strategy: strategy?.strategy }, 'System dispatching to specialized Agent with strategy');
            return await agent.execute(payload, context, signal, strategy);
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
