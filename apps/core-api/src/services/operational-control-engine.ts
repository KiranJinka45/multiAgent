import { logger } from '@packages/observability';
import { CalibrationEngine } from './calibration-engine.js';
import { StabilityEngine } from './stability-engine.js';
import { DistributedExecutionContext } from '@packages/utils';

export interface ControlMetrics {
  confidence: number;
  calibration: number;
  stability: number;
  consensus: number;
  dataQuality: number;
}

export class OperationalControlEngine {
  private static lastReliabilityScore = 1.0;

  /**
   * Computes a calibrated reliability score (0.0 - 1.0).
   * Applies non-linear penalties for degraded metrics to enforce safety.
   */
  public static async computeReliability(metrics: ControlMetrics): Promise<{ score: number; breakdown: ControlMetrics }> {
    // Non-linear penalty: factors below 0.7 are squared to accelerate reliability loss
    const penalized = {
      confidence: metrics.confidence < 0.7 ? Math.pow(metrics.confidence, 1.5) : metrics.confidence,
      calibration: metrics.calibration < 0.7 ? Math.pow(metrics.calibration, 1.5) : metrics.calibration,
      stability: metrics.stability < 0.7 ? Math.pow(metrics.stability, 2) : metrics.stability, // Stability is critical
      consensus: metrics.consensus,
      dataQuality: metrics.dataQuality < 0.5 ? Math.pow(metrics.dataQuality, 2) : metrics.dataQuality
    };

    const targetScore = penalized.confidence * 
                        penalized.calibration * 
                        penalized.stability * 
                        penalized.consensus * 
                        penalized.dataQuality;

    // Slow Recovery Logic: Reliability drops instantly but recovers slowly (max 0.05 per cycle)
    let finalScore = targetScore;
    if (targetScore > this.lastReliabilityScore) {
      finalScore = Math.min(targetScore, this.lastReliabilityScore + 0.05);
    }
    
    this.lastReliabilityScore = finalScore;

    logger.info({ 
      score: finalScore.toFixed(4), 
      target: targetScore.toFixed(4),
      ...metrics 
    }, '[CONTROL] Reliability score computed (with recovery dampening)');

    return {
      score: finalScore,
      breakdown: metrics
    };
  }

  /**
   * Factory method to gather metrics and compute operational reliability.
   */
  public static async evaluate(
    confidence: number, 
    consensus: number, 
    dataQuality: { eventsPerSec: number; disorder: number }
  ) {
    const calibration = 1.0 - (await CalibrationEngine.calculateBrierScore());
    const stability = await StabilityEngine.calculateStabilityScore();
    
    // Data quality heuristics
    let dataQualityFactor = 1.0 - dataQuality.disorder;
    if (dataQuality.eventsPerSec < 0.2) dataQualityFactor *= 0.5;

    return this.computeReliability({
      confidence,
      calibration: Math.max(0.1, calibration),
      stability,
      consensus,
      dataQuality: Math.max(0.1, dataQualityFactor)
    });
  }
}
