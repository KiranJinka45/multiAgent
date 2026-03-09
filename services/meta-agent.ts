import { BaseAgent, AgentResponse } from '@services/base-agent';
import { AgentContext } from '@shared-types/agent-context';
import logger from '@configs/logger';

export interface MetaStrategy {
    intent: 'NEW_PROJECT' | 'FEATURE_UPDATE' | 'BUG_FIX' | 'OPTIMIZATION';
    complexity: 'simple' | 'moderate' | 'complex';
    requiredAgents: string[];
    priority: number;
    recommendedTechStack?: Record<string, string>;
}

export class MetaAgent extends BaseAgent {
    getName() { return 'MetaAgent'; }

    async execute(input: { prompt: string }, _context?: AgentContext, signal?: AbortSignal): Promise<AgentResponse<MetaStrategy>> {
        const { prompt } = input;
        this.log('Analyzing prompt for high-level orchestration strategy...');

        try {
            const system = `You are the Meta-Agent Controller (Top-level Brain). 
Your task is to analyze the user's request and determine the technical intent, complexity, and the specialized agents needed to fulfill it.

Available Agents:
- PlannerAgent: Overall project decomposition (always needed for new projects)
- DatabaseAgent: Schema and DB logic
- BackendAgent: API and Server logic
- FrontendAgent: Components and Styling
- ValidatorAgent: Type safety and debugging
- DockerAgent: Containerization
- DeploymentAgent: Production releases

Output strictly valid JSON matching this schema:
{
  "intent": "NEW_PROJECT|FEATURE_UPDATE|BUG_FIX|OPTIMIZATION",
  "complexity": "simple|moderate|complex",
  "requiredAgents": ["AgentName", ...],
  "priority": number (1: high, 10: low),
  "recommendedTechStack": {
    "framework": "string",
    "database": "string",
    "styling": "string"
  }
}`;

            const { result, tokens } = await this.promptLLM(system, prompt, 'llama-3.3-70b-versatile', signal);
            const strategy = result as MetaStrategy;

            this.log(`Strategy determined: Intent=${strategy.intent}, Complexity=${strategy.complexity}, Agents=${strategy.requiredAgents.join(', ')}`);

            return {
                success: true,
                data: strategy,
                tokens,
                logs: this.logs
            };
        } catch (error) {
            logger.error({ error }, 'MetaAgent analysis failed');
            return {
                success: false,
                data: null as unknown as MetaStrategy,
                logs: this.logs,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
}
