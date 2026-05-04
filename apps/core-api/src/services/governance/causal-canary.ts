import { logger } from '@packages/observability';
import { chaosOrchestrator } from '../chaos-orchestrator';

/**
 * CausalCanary: Implements A/B hold-out logic for autonomous SRE interventions.
 * Ensures every intervention has a counterfactual baseline to prove revenue attribution.
 */
export class CausalCanary {
  private holdOutRate = 0.20; // 20% of interventions are 'Canary' (partial) to build a counterfactual baseline
  private activeCanaries: Set<string> = new Set();

  /**
   * Determines if an action should be full-scale or a canary hold-out.
   */
  public decideActionScope(interventionId: string): 'FULL' | 'CANARY' {
    if (Math.random() < this.holdOutRate) {
      this.activeCanaries.add(interventionId);
      logger.info({ interventionId }, '[CAUSAL-CANARY] Selecting CANARY mode for counterfactual validation');
      return 'CANARY';
    }
    return 'FULL';
  }

  /**
   * Applies a partial healing intensity to simulate a hold-out group.
   */
  public async applyCanary(nodeId: string) {
    logger.warn({ nodeId }, '[CAUSAL-CANARY] Hold-out group established. Applying 50% healing intensity.');
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
