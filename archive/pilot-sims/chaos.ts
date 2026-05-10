import { logger } from '../../observability/src';

export type FailureType = 'NETWORK_PARTITION' | 'WITNESS_COMPROMISE' | 'LATENCY_SPIKE' | 'STORAGE_CORRUPTION' | 'BANAL_EXHAUSTION' | 'POLITICAL_DISPUTE';

/**
 * 🛡️ ChaosEngine
 * Simulates operational entropy and adversarial conditions to validate institutional resilience.
 */
export class ChaosEngine {
  private activeFailures: Set<FailureType> = new Set();

  public injectFailure(type: FailureType): void {
    this.activeFailures.add(type);
    logger.warn({ type }, '[ChaosEngine] FAILURE INJECTED: Operational stress initiated');
  }

  public resolveFailure(type: FailureType): void {
    this.activeFailures.delete(type);
    logger.info({ type }, '[ChaosEngine] FAILURE RESOLVED: Normal operations restored');
  }

  public isFailureActive(type: FailureType): boolean {
    return this.activeFailures.has(type);
  }

  /**
   * Simulates the impact of failures on a governance act.
   */
  public simulateImpact(act: string): boolean {
    if (this.activeFailures.has('NETWORK_PARTITION')) {
      logger.error({ act }, '[ChaosEngine] BLOCKING ACT: Network partition detected');
      return false;
    }

    if (this.activeFailures.has('LATENCY_SPIKE')) {
      logger.warn({ act }, '[ChaosEngine] DELAYING ACT: Excessive operational latency');
      // In a real system, this would introduce a delay
    }

    return true;
  }
}
