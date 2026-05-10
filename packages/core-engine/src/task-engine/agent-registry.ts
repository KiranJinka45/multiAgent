import { 
    AgentResponse, 
    StrategyConfig 
} from '@packages/utils';
import { logger } from '@packages/observability';

// Mock context types
export interface AgentContext { executionId: string; metadata: Record<string, any>; }

export interface TaskAgent {
    execute(payload: any, context?: AgentContext, signal?: AbortSignal, strategy?: typeof StrategyConfig): Promise<AgentResponse<any>>;
}

export class AgentRegistry {
    private agents: Map<string, TaskAgent> = new Map();
    private initialized: boolean = false;

    private ensureInitialized() {
        if (this.initialized) return;
        this.initialized = true;

        try {
            // Lazy load agents to break circular dependency:
            // @packages/agents -> @packages/core-engine -> @packages/utils -> @packages/agents
            // We use the absolute path to be extremely safe in this environment
            const agentsModule = require('../../../agents/src/index');
            
            // Map legacy/expected names to available specialized agents
            this.register('DatabaseAgent', new agentsModule.CoderAgent());
            this.register('BackendAgent', new agentsModule.CoderAgent());
            this.register('FrontendAgent', new agentsModule.CoderAgent());
            this.register('DeploymentAgent', new agentsModule.CoderAgent());
            this.register('TestingAgent', new agentsModule.CoderAgent());
            this.register('ValidatorAgent', new agentsModule.ValidatorAgent());

            // Register new specialized agents
            this.register('CoderAgent', new agentsModule.CoderAgent());
            this.register('PlannerAgent', new agentsModule.PlannerAgent());
            this.register('SecurityAgent', new agentsModule.SecurityAgent());
            this.register('AuditorAgent', new agentsModule.AuditorAgent());
            this.register('HealerAgent', new agentsModule.HealerAgent());

            logger.info('[AgentRegistry] Specialized agents lazily initialized successfully.');
        } catch (error) {
            logger.error({ error }, '[AgentRegistry] Failed to lazily initialize agents');
            // We don't throw here to avoid crashing the whole system if one agent fails to load,
            // but subsequent getAgent calls will return undefined.
        }
    }

    /**
     * Registers a specific agent subclass implementation against a common task action.
     */
    register(taskType: string, agent: TaskAgent) {
        this.agents.set(taskType, agent);
    }

    getAgent(taskType: string): TaskAgent | undefined {
        this.ensureInitialized();
        return this.agents.get(taskType);
    }

    hasAgent(taskType: string): boolean {
        this.ensureInitialized();
        return this.agents.has(taskType);
    }

    async runTaskDirectly(taskType: string, payload: any, context?: AgentContext, signal?: AbortSignal, strategy?: typeof StrategyConfig): Promise<AgentResponse<any>> {
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
