import { logger } from '@packages/observability';
import { chaosOrchestrator } from '../chaos-orchestrator.js';

/**
 * CausalCanary: Implements A/B hold-out logic for autonomous SRE interventions.
 * This allows the DigitalTwin to measure the counterfactual uplift of an action.
 */
export class CausalCanary {
  private activeCanaries: Set<string> = new Set();

  /**
   * Registers a new causal experiment.
   */
  public registerExperiment(interventionId: string) {
    this.activeCanaries.add(interventionId);
    logger.info({ interventionId }, '[CAUSAL-CANARY] Registered new intervention experiment');
  }

  /**
   * Applies a partial healing intensity to simulate a hold-out group.
   */
  public async applyCanary(nodeId: string) {
    logger.warn({ nodeId }, '[CAUSAL-CANARY] Hold-out group established. Applying 50% healing intensity.');
    // @ts-ignore
    chaosOrchestrator.partialHeal(nodeId, 0.5);
  }

  public isCanary(interventionId: string): boolean {
    return this.activeCanaries.has(interventionId);
  }

  public clearCanary(interventionId: string) {
    this.activeCanaries.delete(interventionId);
  }
}

export const causalCanary = new CausalCanary();
