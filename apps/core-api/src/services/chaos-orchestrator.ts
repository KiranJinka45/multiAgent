import { logger } from '@packages/observability';
import { sreEngine } from './sre-engine';
import { validationEngine } from './validation-engine';

export type ChaosScenario = 'LATENCY_SPIKE' | 'DATA_LOSS' | 'DISTRIBUTION_SHIFT' | 'FLAPPING' | 'DEPENDENCY_FAILURE' | 'SLOW_DEGRADATION' | 'RETRY_STORM';


export class ChaosOrchestrator {
  private activeScenario: ChaosScenario | null = null;
  private targetNode: string = 'api-service';
  private healingIntensity: number = 1.0; // 1.0 = full failure, 0.0 = fully healed

  /**
   * Injects a specific failure mode into the telemetry pipeline.
   * This is used for "Empirical Validation" of the SRE Control Plane.
   */
  public inject(scenario: ChaosScenario, nodeId: string = 'api-service') {
    this.activeScenario = scenario;
    this.targetNode = nodeId;
    this.healingIntensity = 1.0;
    validationEngine.onChaosStart();
    logger.warn({ scenario, nodeId }, '[CHAOS] Injecting failure scenario');
    sreEngine.addEvent('CHAOS_INJECTION', `Injected ${scenario} on ${nodeId}`, 'WARNING');
  }

  public clear() {
    this.activeScenario = null;
    this.targetNode = 'api-service';
    validationEngine.onChaosEnd();
    logger.info('[CHAOS] Failure scenarios cleared');
  }

  public heal(nodeId: string) {
    if (this.targetNode === nodeId) {
      this.clear();
      logger.info({ nodeId }, '[CHAOS] Node fully healed by SRE intervention');
    }
  }

  public partialHeal(nodeId: string, intensity: number) {
    if (this.targetNode === nodeId) {
      this.healingIntensity = Math.max(0, Math.min(1, intensity));
      logger.info({ nodeId, intensity }, '[CHAOS] Node intensity reduced (Partial Heal)');
    }
  }

  /**
   * Mutates incoming signals based on the active chaos scenario.
   */
  public mutateSignal(originalValue: number, nodeId: string = 'api-service'): number {
    if (!this.activeScenario || this.targetNode !== nodeId) return originalValue;

    let mutatedValue = originalValue;
    const boost = this.healingIntensity;

    switch (this.activeScenario) {
      case 'LATENCY_SPIKE':
        mutatedValue = originalValue * (1 + (4 * boost) + (Math.random() * 2 * boost));
        break;
      case 'DATA_LOSS':
        mutatedValue = Math.random() > (0.8 * boost) ? originalValue : 0;
        break;
      case 'DISTRIBUTION_SHIFT':
        mutatedValue = originalValue + (2.5 * boost);
        break;
      case 'FLAPPING':
        mutatedValue = Math.random() > 0.5 ? originalValue : originalValue * (1 + (9 * boost));
        break;
      case 'DEPENDENCY_FAILURE':
        // Simulates partial connectivity: 20% of requests are extreme latency spikes
        mutatedValue = Math.random() > (0.8 * boost) ? originalValue * (10 * boost) : originalValue;
        break;
      case 'SLOW_DEGRADATION':
        // Latency climbs by 10% per minute of active chaos
        const minutesSinceStart = (Date.now() - validationEngine.getStartTime()) / 60000;
        mutatedValue = originalValue * (1 + (minutesSinceStart * 0.15 * boost));
        break;
      case 'RETRY_STORM':
        // High baseline latency (2x) with rapid jitter to simulate queue contention
        mutatedValue = (originalValue * 2 * boost) + (Math.random() * 100 * boost);
        break;
    }


    // Report to Causal Layer if the mutation results in a high anomaly
    if (mutatedValue > 1.5) {
      sreEngine.reportNodeAnomaly(nodeId, Math.min(1.0, mutatedValue / 10));
    }

    return mutatedValue;
  }

  public getActiveScenario() {
    return this.activeScenario;
  }

  public getTargetNode() {
    return this.targetNode;
  }
}

export const chaosOrchestrator = new ChaosOrchestrator();
