export interface NoveltyScore {
  zScore: number;
  noveltyScore: number; // 0 to 100
  classification: 'NOMINAL' | 'UNUSUAL' | 'ANOMALOUS';
}

export interface EntropySpikeReport {
  hasEntropySpike: boolean;
  metricEntropies: Map<string, number>;
  spikedMetrics: string[];
}

export interface SilenceReport {
  hasUnexpectedSilence: boolean;
  silentSubsystems: {
    subsystem: string;
    lastSeenMsAgo: number;
  }[];
}

export class NoveltyTelemetryEngine {
  private baselines = new Map<string, { mean: number; stdDev: number }>();

  /**
   * Records historical baseline values for a specific telemetry metric.
   */
  public recordBaseline(metricName: string, values: number[]): void {
    if (values.length === 0) return;

    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance) || 1; // prevent division by zero

    this.baselines.set(metricName, { mean, stdDev });
  }

  /**
   * Computes the z-score and novelty score for an incoming telemetry metric value.
   */
  public scoreBehavioralNovelty(metricName: string, value: number): NoveltyScore {
    const baseline = this.baselines.get(metricName);
    if (!baseline) {
      // No baseline established: assume nominal for now
      return { zScore: 0, noveltyScore: 0, classification: 'NOMINAL' };
    }

    const { mean, stdDev } = baseline;
    const zScore = Math.abs(value - mean) / stdDev;

    let noveltyScore = 0;
    let classification: NoveltyScore['classification'] = 'NOMINAL';

    if (zScore <= 1.0) {
      noveltyScore = Math.round(zScore * 20); // 0 to 20
      classification = 'NOMINAL';
    } else if (zScore <= 3.0) {
      noveltyScore = Math.round(20 + ((zScore - 1) / 2) * 60); // 20 to 80
      classification = 'UNUSUAL';
    } else {
      noveltyScore = Math.round(80 + Math.min(20, (zScore - 3) * 5)); // 80 to 100
      classification = 'ANOMALOUS';
    }

    return {
      zScore: Math.round(zScore * 100) / 100,
      noveltyScore,
      classification
    };
  }

  /**
   * Computes Shannon Entropy over moving windows to identify sudden chaotic spikes in telemetry.
   */
  public detectEntropySpikes(
    metrics: Map<string, number[]>,
    windowSize: number = 10,
    entropySpikeThreshold: number = 2.0
  ): EntropySpikeReport {
    const metricEntropies = new Map<string, number>();
    const spikedMetrics: string[] = [];

    for (const [metricName, values] of metrics.entries()) {
      if (values.length < windowSize) {
        metricEntropies.set(metricName, 0);
        continue;
      }

      // Take the most recent window values
      const windowValues = values.slice(-windowSize);
      const entropy = this.calculateShannonEntropy(windowValues);
      metricEntropies.set(metricName, entropy);

      // Flag a spike if the current window entropy exceeds the threshold
      if (entropy > entropySpikeThreshold) {
        spikedMetrics.push(metricName);
      }
    }

    return {
      hasEntropySpike: spikedMetrics.length > 0,
      metricEntropies,
      spikedMetrics
    };
  }

  /**
   * Monitors active subsystems for unexpected silences/crashes.
   */
  public monitorUnexpectedSilence(
    lastHeartbeats: Map<string, number>,
    thresholdMs: number
  ): SilenceReport {
    const now = Date.now();
    const silentSubsystems: SilenceReport['silentSubsystems'] = [];

    for (const [subsystem, lastTimestamp] of lastHeartbeats.entries()) {
      const elapsed = now - lastTimestamp;
      if (elapsed > thresholdMs) {
        silentSubsystems.push({
          subsystem,
          lastSeenMsAgo: elapsed
        });
      }
    }

    return {
      hasUnexpectedSilence: silentSubsystems.length > 0,
      silentSubsystems
    };
  }

  // --- PRIVATE UTILITIES ---

  private calculateShannonEntropy(values: number[]): number {
    if (values.length === 0) return 0;

    // Bucket values by rounding to 1 decimal place to capture frequency densities
    const buckets = new Map<string, number>();
    for (const val of values) {
      const bucketKey = val.toFixed(1);
      buckets.set(bucketKey, (buckets.get(bucketKey) ?? 0) + 1);
    }

    let entropy = 0;
    const n = values.length;

    for (const count of buckets.values()) {
      const p = count / n;
      entropy -= p * Math.log2(p);
    }

    return Math.round(entropy * 100) / 100;
  }
}
