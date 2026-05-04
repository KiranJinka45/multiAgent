import { logger } from '@packages/observability';

export interface SLOConfig {
  target: number; // e.g., 0.999 for 99.9%
}

export class SLOManager {
  constructor(private config: SLOConfig = { target: 0.999 }) {}

  /**
   * Error Budget = 1 - SLO
   */
  public getErrorBudget(): number {
    return 1 - this.config.target;
  }

  /**
   * Burn Rate = Observed Error Rate / Allowed Error Rate
   */
  public computeBurnRate(errorRate: number): number {
    const allowed = this.getErrorBudget();
    if (allowed === 0) return errorRate > 0 ? Infinity : 0;
    return errorRate / allowed;
  }

  /**
   * Classifies the incident severity based on the Burn Rate.
   * Aligned with SRE best practices.
   */
  public classify(burnRate: number): 'IGNORE' | 'OBSERVE' | 'ALERT' | 'CRITICAL' {
    if (burnRate < 1) return 'IGNORE';
    if (burnRate < 2) return 'OBSERVE';
    if (burnRate < 5) return 'ALERT';
    return 'CRITICAL';
  }
}

export const sloManager = new SLOManager();
