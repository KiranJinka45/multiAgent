import { logger } from '@packages/observability';

interface SrePolicy {
  id: string;
  stabilityThreshold: number;
  brierSafetyLimit: number;
  lastUpdated: string;
  version: number;
}

export class PolicyOptimizer {
  private currentPolicy: SrePolicy = {
    id: 'default-control',
    stabilityThreshold: 0.0,
    brierSafetyLimit: 0.25,
    lastUpdated: new Date().toISOString(),
    version: 1
  };

  /**
   * Refines the operational policy based on regret and accuracy trends.
   */
  public async optimize(avgRegret: number, avgBrier: number): Promise<SrePolicy> {
    let changed = false;

    // If regret is high (> 0.2), we are being too aggressive -> raise stability threshold
    if (avgRegret > 0.2) {
      this.currentPolicy.stabilityThreshold += 0.05;
      changed = true;
      logger.warn({ avgRegret }, 'High regret detected: Increasing stability threshold for safety');
    }

    // If Brier score is high (> 0.2), we are losing calibration -> tighten safety limits
    if (avgBrier > 0.2) {
      this.currentPolicy.brierSafetyLimit -= 0.02;
      changed = true;
      logger.warn({ avgBrier }, 'Calibration drift detected: Tightening Brier safety limits');
    }

    if (changed) {
      // Cap stability threshold to ensure system doesn't permanently halt in simulation
      this.currentPolicy.stabilityThreshold = Math.min(0.5, this.currentPolicy.stabilityThreshold);
      this.currentPolicy.version++;
      this.currentPolicy.lastUpdated = new Date().toISOString();
      logger.info(this.currentPolicy, 'Operational policy autonomously refined');
    }

    return this.currentPolicy;
  }

  public getPolicy(): SrePolicy {
    return this.currentPolicy;
  }

  public reset() {
    this.currentPolicy = {
      id: 'default-control',
      stabilityThreshold: 0.1,
      brierSafetyLimit: 0.25,
      lastUpdated: new Date().toISOString(),
      version: 1
    };
    logger.info('[PolicyOptimizer] Policy reset to baseline');
  }
}

export const policyOptimizer = new PolicyOptimizer();
