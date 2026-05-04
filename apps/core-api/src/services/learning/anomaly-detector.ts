import { logger } from '@packages/observability';
import { isolationForestService } from './isolation-forest.service';

/**
 * AnomalyEnsemble: A production-grade multi-variate detector.
 * Combines Statistical (Z-Score), Change-Point (CUSUM), and ML (Isolation Forest).
 */
export class AnomalyEnsemble {
  // 1. Z-Score State
  private ema = 0;
  private emv = 0;
  private initialized = false;
  private totalSamples = 0;
  private readonly alpha = 0.15;
  private readonly beta = 0.15;

  // 2. CUSUM (Cumulative Sum) State - Catching subtle shifts
  private cusumPos = 0;
  private readonly cusumK = 0.5;
  private readonly cusumH = 4.0;

  // 3. Online Quantile Estimation
  private window: number[] = [];
  private readonly windowSize = 100;

  public get totalSamplesCount() {
    return this.totalSamples;
  }

  /**
   * Updates the ensemble with a new value and returns an aggregated anomaly score.
   * Fusion strategy: Weighted combination of Stat + ML + Drift.
   */
  public update(value: number) {
    this.totalSamples++;
    this.updateWindow(value);

    if (!this.initialized) {
      this.ema = value;
      this.emv = 0;
      this.initialized = true;
      return this.emptyResult();
    }

    // --- 1. Statistical Signal (Z-Score) ---
    const prevEma = this.ema;
    this.ema = this.alpha * value + (1 - this.alpha) * this.ema;
    const diff = value - prevEma;
    this.emv = this.beta * (diff * diff) + (1 - this.beta) * this.emv;
    const stdDev = Math.sqrt(this.emv) || 1e-6;
    const zScore = (value - this.ema) / stdDev;
    const statSignal = Math.min(1, Math.max(0, zScore) / 3.0);

    // --- 2. Drift Signal (CUSUM) ---
    this.cusumPos = Math.max(0, this.cusumPos + (zScore - this.cusumK));
    const driftSignal = Math.min(1, this.cusumPos / this.cusumH);

    // --- 3. ML Signal (Isolation Forest) ---
    const mlSignal = isolationForestService.score(value);

    // --- 4. Quantile Breach (P99) ---
    const p99 = this.calculateP99();
    const quantileBreach = value > p99 && this.totalSamples > this.windowSize;

    /**
     * FUSION STRATEGY (Production-Grade)
     * 0.4 * Statistical Ensemble (Z + P99)
     * 0.4 * ML Signal (Isolation Forest)
     * 0.2 * Drift Signal (CUSUM)
     */
    const ensembleStat = (statSignal * 0.7) + (quantileBreach ? 0.3 : 0);
    const aggregatedScore = (0.4 * ensembleStat) + (0.4 * mlSignal) + (0.2 * driftSignal);

    const isAnomaly = aggregatedScore > 0.7 && this.totalSamples > 20;

    if (isAnomaly) {
      logger.warn({ 
        value, 
        aggregatedScore,
        statSignal,
        mlSignal,
        driftSignal
      }, '[AnomalyEnsemble] Fusion Detection Triggered');
      
      this.cusumPos = 0; // Reset CUSUM on detection
    }

    return {
      isAnomaly,
      zScore,
      cusum: this.cusumPos,
      p99,
      aggregatedScore,
      confidence: aggregatedScore,
      metadata: {
        stat: statSignal,
        ml: mlSignal,
        drift: driftSignal
      }
    };
  }

  private updateWindow(val: number) {
    this.window.push(val);
    if (this.window.length > this.windowSize) {
      this.window.shift();
    }
  }

  private calculateP99() {
    if (this.window.length < 10) return 1e9; // High default
    const sorted = [...this.window].sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * 0.99);
    return sorted[idx];
  }

  private emptyResult() {
    return { 
      isAnomaly: false, 
      zScore: 0, 
      cusum: 0, 
      p99: 0, 
      aggregatedScore: 0, 
      confidence: 0 
    };
  }

  public getStats() {
    return {
      ema: this.ema,
      stdDev: Math.sqrt(this.emv),
      samples: this.totalSamples,
      cusum: this.cusumPos,
      p99: this.calculateP99()
    };
  }
}
