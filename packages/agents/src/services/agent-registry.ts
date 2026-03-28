import logger from '@packages/utils';
import { DatabaseAgent } from '../';
import { BackendAgent } from '../';
import { FrontendAgent } from '../';
import { DeploymentAgent } from '../';
import { TestingAgent } from '../';
import { ValidatorAgent } from '../';

import { StrategyConfig } from '@packages/utils';
import { AgentRequest, AgentResponse } from '@packages/contracts';

export interface TaskAgent {
    execute(request: AgentRequest<unknown>, signal?: AbortSignal, strategy?: StrategyConfig): Promise<AgentResponse<unknown>>;
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

    async runTaskDirectly(
        taskType: string,
        request: AgentRequest,
        signal?: AbortSignal,
        strategy?: StrategyConfig
    ): Promise<AgentResponse<unknown>> {
        const agent = this.getAgent(taskType);
        if (!agent) {
            return {
                success: false,
                data: null,
                artifacts: [],
                metrics: { durationMs: 0, tokensTotal: 0 },
                error: `No agent registered in AgentRegistry for task type: ${taskType}`
            };
        }

        try {
            logger.info({ taskType, executionId: request.context.executionId }, 'System dispatching to specialized Agent');
            return await agent.execute(request, signal, strategy);
        } catch (error) {
            logger.error({ error, taskType }, 'Specialized agent crashed during execution');
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

import { PlannerAgent } from '../';
import { SecurityAgent } from '../';
import { MonitoringAgent } from '../';
import { DebugAgent } from '../';
import { JudgeAgent } from '../';
import { SaaSMonetizationAgent } from '../';
import { SandboxEditorAgent } from '../';

// Global registry export
export const agentRegistry = new AgentRegistry();

// Auto-registration of core agents
agentRegistry.register('planner', new PlannerAgent());
agentRegistry.register('database', new DatabaseAgent());
agentRegistry.register('frontend', new FrontendAgent());
agentRegistry.register('backend', new BackendAgent());
agentRegistry.register('deploy', new DeploymentAgent());
agentRegistry.register('security', new SecurityAgent());
agentRegistry.register('monitor', new MonitoringAgent());
agentRegistry.register('debug', new DebugAgent());
agentRegistry.register('judge', new JudgeAgent());
agentRegistry.register('test', new TestingAgent());
agentRegistry.register('validator', new ValidatorAgent());
agentRegistry.register('monetization', new SaaSMonetizationAgent());
agentRegistry.register('sandbox-editor', new SandboxEditorAgent());
