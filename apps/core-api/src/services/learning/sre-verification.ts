import { logger } from '@packages/observability';
import { CalibrationEngine } from '../calibration-engine';
import { sreEngine } from '../sre-engine';

export class SreVerificationService {
  /**
   * Verify the actual outcome of an anomaly hypothesis.
   * This is called manually by SREs or automatically by a secondary "perfect" observer.
   */
  public static async verifyOutcome(sequenceId: number, actualType: 'NOMINAL' | 'GRAY_FAILURE' | 'HARD_FAILURE') {
    logger.info({ sequenceId, actualType }, '[SRE] Verifying ground truth for sequence');

    // In a real system, we would look up the hypothesis recorded for this sequenceId
    // For now, we update the latest sample in the calibration engine to correlate with ground truth
    const state = await sreEngine.getCurrentStateAsync();
    const outcome = actualType === 'NOMINAL' ? 1.0 : 0.0; // Simplified for Brier

    await CalibrationEngine.recordSample(
      state.perception.anomalyHypothesis.confidence,
      outcome,
      state.perception.anomalyHypothesis.type,
      actualType
    );

    logger.info('[SRE] Ground truth recorded. Accuracy metrics will recalculate.');
  }
}
