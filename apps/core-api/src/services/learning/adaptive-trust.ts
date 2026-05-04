import { logger } from '@packages/observability';
import { DriftMetrics } from './drift-detector';

export class AdaptiveTrustManager {
  private lambda = 0.5; // Sensitivity to Brier drift
  private recoveryRate = 0.02; // How fast trust recovers after a dip

  /**
   * Adjusts the base trust score using detected drift metrics.
   * Trust = BaseTrust * (1 - lambda * ConceptDrift)
   */
  public adjustTrust(baseTrust: number, drift: DriftMetrics): number {
    let adjusted = baseTrust;

    // 1. Penalize for Concept Drift (Brier shift)
    if (drift.conceptDrift > 0.05) {
      const penalty = this.lambda * drift.conceptDrift;
      adjusted *= (1 - penalty);
      logger.warn({ penalty, adjusted }, '[ADAPTIVE-TRUST] Applying concept drift penalty');
    }

    // 2. Penalize for Policy Drift (Regret trend)
    if (drift.policyDrift > 0.01) {
      adjusted *= 0.9; // 10% safety haircut
      logger.warn('[ADAPTIVE-TRUST] Applying policy drift safety haircut');
    }

    // 3. Apply Slow Recovery Damping
    // We don't want trust to snap back instantly
    const smoothed = Math.min(baseTrust, adjusted + this.recoveryRate);

    return Math.max(0, Math.min(1, smoothed));
  }
}

export const adaptiveTrustManager = new AdaptiveTrustManager();
