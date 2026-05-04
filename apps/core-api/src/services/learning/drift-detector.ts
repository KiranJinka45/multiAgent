import { logger } from '@packages/observability';

export interface DriftMetrics {
  dataDrift: number;     // Wasserstein distance on input signals
  conceptDrift: number;  // Shift in Brier calibration
  policyDrift: number;   // Slope of regret trend
  overallDriftScore: number;
}

export class DriftDetectorService {
  private baselineBrier: number = 0.18; // From 7-day soak
  private regretHistory: number[] = [];
  private readonly MAX_HISTORY = 100;

  public calculateDrift(
    currentSignals: number[], 
    baselineSignals: number[],
    currentBrier: number,
    currentRegret: number
  ): DriftMetrics {
    
    // 1. Data Drift (Simplified Wasserstein)
    const dataDrift = this.calculateWasserstein(currentSignals, baselineSignals);

    // 2. Concept Drift (Brier Shift)
    const conceptDrift = Math.max(0, currentBrier - this.baselineBrier);

    // 3. Policy Drift (Regret Trend)
    this.regretHistory.push(currentRegret);
    if (this.regretHistory.length > this.MAX_HISTORY) this.regretHistory.shift();
    const policyDrift = this.calculateRegretSlope();

    const overallDriftScore = (dataDrift * 0.3) + (conceptDrift * 0.5) + (policyDrift * 0.2);

    logger.debug({ dataDrift, conceptDrift, policyDrift, overallDriftScore }, '[DRIFT] Adaptation cycle complete');

    return {
      dataDrift,
      conceptDrift,
      policyDrift,
      overallDriftScore
    };
  }

  private calculateWasserstein(a: number[], b: number[]): number {
    if (a.length === 0 || b.length === 0) return 0;
    // Simple EMD for 1D distributions
    const sortedA = [...a].sort((x, y) => x - y);
    const sortedB = [...b].sort((x, y) => x - y);
    let dist = 0;
    const len = Math.min(sortedA.length, sortedB.length);
    for (let i = 0; i < len; i++) {
      dist += Math.abs(sortedA[i] - sortedB[i]);
    }
    return dist / len;
  }

  private calculateRegretSlope(): number {
    if (this.regretHistory.length < 10) return 0;
    const n = this.regretHistory.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += this.regretHistory[i];
      sumXY += i * this.regretHistory[i];
      sumXX += i * i;
    }
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return Math.max(0, slope); // Only return positive (bad) slope
  }
}

export const driftDetector = new DriftDetectorService();
