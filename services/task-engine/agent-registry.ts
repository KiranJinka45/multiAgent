import { AgentResponse } from '../../agents/base-agent';
import logger from '../../config/logger';
import { DatabaseAgent } from '../../agents/database-agent';
import { BackendAgent } from '../../agents/backend-agent';
import { FrontendAgent } from '../../agents/frontend-agent';
import { DeploymentAgent } from '../../agents/deploy-agent';
import { TestingAgent } from '../../agents/testing-agent';
import { ValidatorAgent } from '../../agents/validator-agent';

import { StrategyConfig } from '../agent-intelligence/strategy-engine';
import { AgentContext } from '../../types/agent-context';

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
