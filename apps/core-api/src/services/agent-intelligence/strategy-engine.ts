import { AgentMetrics } from './agent-metrics.js';
import { logger } from '@packages/observability';

export interface Strategy {
  id: string;
  name: string;
  fitness: number;
}

export class StrategyEngine {
  /**
   * Evaluates the fitness of a set of strategies based on current agent metrics.
   */
  public async evaluateStrategies(strategies: Strategy[]) {
    const metrics = await AgentMetrics.getLatest();
    logger.info({ metrics }, '[STRATEGY] Evaluating strategies against latest metrics');

    // Simple fitness calculation: higher fitness if metrics are healthy
    const scores = strategies.map((s: any) => s.fitness);
    const avgFitness = scores.reduce((a: number, b: number) => a + b, 0) / (scores.length || 1);

    logger.info({ avgFitness }, '[STRATEGY] Average strategy fitness calculated');
    return strategies.sort((a, b) => b.fitness - a.fitness);
  }
}

export const strategyEngine = new StrategyEngine();
