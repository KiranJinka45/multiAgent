import { logger } from '@packages/observability';
import { driftDetector } from './drift-detector.js';

export class AdaptiveReliabilityManager {
  private lambda = 0.5; // Sensitivity to Brier drift
  private recoveryRate = 0.05;

  /**
   * Adjusts the base reliability score using detected drift metrics.
   */
  public adjustReliability(baseReliability: number, drift: any): number {
    let adjusted = baseReliability;

    // 1. Penalize for Concept Drift (Brier shift)
    if (drift.conceptDrift > 0.1) {
      const penalty = drift.conceptDrift * this.lambda;
      adjusted -= penalty;
      logger.warn({ penalty, adjusted }, '[ADAPTIVE-RELIABILITY] Applying concept drift penalty');
    }

    // 2. Penalize for Policy Drift (Regret trend)
    if (drift.policyDrift > 0.01) {
      adjusted *= 0.9; // 10% safety haircut
      logger.warn('[ADAPTIVE-RELIABILITY] Applying policy drift safety haircut');
    }

    // 3. Apply Slow Recovery Damping
    // We don't want reliability to snap back instantly
    const smoothed = Math.min(baseReliability, adjusted + this.recoveryRate);

    return Math.max(0, Math.min(1, smoothed));
  }
}

export const adaptiveReliabilityManager = new AdaptiveReliabilityManager();
