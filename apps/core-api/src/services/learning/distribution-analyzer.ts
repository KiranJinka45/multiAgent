import { redis } from '@packages/utils';
import { logger } from '@packages/observability';

export interface BaselineProfile {
  ttac: { p50: number; p95: number; p99: number; variance: number };
  disorder: { mean: number; p95: number; stdDev: number };
  brier: { mean: number; stability: number };
  divergenceKL: number;
  wassersteinDistance: number;
  timestamp: string;
}

export class DistributionAnalyzer {
  private static SHORT_WINDOW_KEY = 'sre:baseline:snapshots:short';
  private static LONG_WINDOW_KEY = 'sre:baseline:snapshots:long';

  public static async generateProfile(): Promise<BaselineProfile | null> {
    const snapshotsJson = await redis.get(this.LONG_WINDOW_KEY);
    if (!snapshotsJson) return null;

    const snapshots = JSON.parse(snapshotsJson);
    if (snapshots.length < 10) return null; // Insufficient data

    const ttacs = snapshots.map((s: any) => s.metrics.slidingP95TTAC).sort((a: number, b: number) => a - b);
    const disorders = snapshots.map((s: any) => 1.0 - s.metrics.signalQuality).sort((a: number, b: number) => a - b);
    const briers = snapshots.map((s: any) => s.metrics.brierScore);

    const profile: BaselineProfile = {
      ttac: {
        p50: this.getPercentile(ttacs, 0.5),
        p95: this.getPercentile(ttacs, 0.95),
        p99: this.getPercentile(ttacs, 0.99),
        variance: this.getVariance(ttacs)
      },
      disorder: {
        mean: disorders.reduce((a: number, b: number) => a + b, 0) / disorders.length,
        p95: this.getPercentile(disorders, 0.95),
        stdDev: Math.sqrt(this.getVariance(disorders))
      },
      brier: {
        mean: briers.reduce((a: number, b: number) => a + b, 0) / briers.length,
        stability: 1.0 - this.getVariance(briers) // 1.0 = Perfectly stable
      },
      divergenceKL: await this.calculateKLDivergence(ttacs),
      wassersteinDistance: await this.calculateWassersteinDistance(ttacs),
      timestamp: new Date().toISOString()
    };

    logger.info({ profile }, '[SRE] Baseline profile generated from soak data');
    return profile;
  }

  private static async calculateWassersteinDistance(currentSet: number[]): Promise<number> {
    // Earth Mover's Distance between current and baseline distributions
    const baselineJson = await redis.get('sre:baseline:snapshots:original');
    if (!baselineJson) return 0;
    const baseline = JSON.parse(baselineJson).map((s: any) => s.metrics.slidingP95TTAC).sort((a: any, b: any) => a - b);

    // For 1D distributions, W1 is the integral of the difference between CDFs
    let distance = 0;
    const samples = Math.min(currentSet.length, baseline.length);
    for (let i = 0; i < samples; i++) {
      distance += Math.abs(currentSet[i] - baseline[i]);
    }
    return distance / samples;
  }

  private static async calculateKLDivergence(currentSet: number[]): Promise<number> {
    // Relative Entropy between current and baseline distributions
    const baselineJson = await redis.get('sre:baseline:snapshots:original'); // Stored on Day 1
    if (!baselineJson) return 0;
    const baseline = JSON.parse(baselineJson).map((s: any) => s.metrics.slidingP95TTAC).sort((a: any, b: any) => a - b);

    // Simplified KL approximation for sorted samples
    let sum = 0;
    const bins = 10;
    for (let i = 0; i < bins; i++) {
      const p = this.getPercentile(currentSet, i / bins) || 0.001;
      const q = this.getPercentile(baseline, i / bins) || 0.001;
      sum += p * Math.log(p / q);
    }
    return Math.max(0, sum);
  }

  private static getPercentile(sorted: number[], p: number): number {
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[index];
  }

  private static getVariance(arr: number[]): number {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
  }
}
