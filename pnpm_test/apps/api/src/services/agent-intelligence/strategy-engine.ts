import { AgentMetrics } from './agent-metrics';
import logger from '@config/logger';

export type AgentStrategy = 'direct_generation' | 'memory_augmented' | 'template_driven' | 'multi_pass_review';

export interface StrategyConfig {
    strategy: AgentStrategy;
    temperature: number;
    contextWindow: number;
    model: string;
}

export class StrategyEngine {
    /**
     * Determines the optimal strategy for an agent based on historical performance.
     */
    static async getOptimalStrategy(agentName: string, taskType: string): Promise<StrategyConfig> {
        const stats = await AgentMetrics.getAgentStats(agentName);
        const taskStats = stats?.find(s => s.task_type === taskType);

        // Default strategy
        let strategy: AgentStrategy = 'direct_generation';
        let temperature = 0.7;

        if (taskStats) {
            const successRate = taskStats.success_rate || 0;

            // Evolution Logic: If performance is poor, switch to a more robust strategy
            if (successRate < 0.75) {
                logger.warn({ agentName, successRate }, '[StrategyEngine] Performance below threshold. Escalating to memory_augmented strategy.');
                strategy = 'memory_augmented';
                temperature = 0.5; // More precise
            } else if (successRate > 0.95) {
                logger.info({ agentName }, '[StrategyEngine] High performance detected. Optimizing for speed.');
                temperature = 0.8; // More creative/fast
            }
        }

        return {
            strategy,
            temperature,
            contextWindow: 4000,
            model: 'llama-3.1-8b-instant'
        };
    }

    /**
     * Optimizes a prompt based on learned patterns (Mock implementation).
     */
    static async optimizePrompt(basePrompt: string, agentName: string): Promise<string> {
        // In a real system, this would fetch successful variants from a DB
        if (agentName === 'UIAgent' && !basePrompt.includes('Tailwind')) {
            return `${basePrompt}\nEnsure accessibility standards and use Tailwind CSS for styling.`;
        }
        return basePrompt;
    }
}
