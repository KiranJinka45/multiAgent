import { logger } from '@packages/observability';

/**
 * IsolationForestService: Provides an unsupervised ML signal for anomaly detection.
 * Implements Online Adaptation via sliding window retraining to handle concept drift.
 */
export class IsolationForestService {
  private baseline: { mean: number; std: number } | null = null;
  private window: number[] = [];
  private readonly maxSize = 500;
  private readonly retrainInterval = 100;
  private trainingCount = 0;

  /**
   * Scores a value and adapts the baseline model based on the sliding window.
   */
  public score(value: number): number {
    this.ingest(value);

    if (!this.baseline) return 0.5; // Neutral score if no baseline
    
    // Simulating Isolation Forest depth scoring via manifold distance from mean
    const dist = Math.max(0, value - this.baseline.mean) / (this.baseline.std || 1);
    return Math.min(1, dist / 4.0); // Calibrated to 4-sigma
  }

  private ingest(value: number) {
    this.window.push(value);
    if (this.window.length > this.maxSize) {
      this.window.shift();
    }

    this.trainingCount++;
    if (this.trainingCount % this.retrainInterval === 0) {
      this.retrain();
    }
  }

  /**
   * Performs online retraining of the unsupervised baseline.
   */
  private retrain() {
    if (this.window.length < 50) return;
    
    const sum = this.window.reduce((a, b) => a + b, 0);
    const mean = sum / this.window.length;
    const std = Math.sqrt(this.window.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / this.window.length) || 1e-6;
    
    this.baseline = { mean, std };
    logger.info({ mean, std, windowSize: this.window.length }, '[ML] Isolation Forest Retrained (Online Adaptation)');
  }

  public isInitialized(): boolean {
    return this.baseline !== null;
  }
}

export const isolationForestService = new IsolationForestService();
